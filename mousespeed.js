(function (global) {

  var requestAnimFrame = (function(){
    return  window.requestAnimationFrame       ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame    ||
            function( callback ){
              window.setTimeout(callback, 1000 / 60);
            };
  })();

  var ifSlowCallbacks = [];
  var debug = function (message) {
    if (mouse.debug) {
      console.debug(message);
    }
  };

  var mouse = {
    x: 0,
    y: 0,
    lastX: 0,
    lastY: 0,
    lastTime: new Date().getTime(),
    lastDistance: 0,
    speed: 0,
    slowLimit: 200, // under px/sec
    tryCallback: 2,
    dataAttr: 'data-mousespeed',
    isSlow: function () {
      return mouse.speed < mouse.slowLimit;
    },
    // call callback if mouse is slow, or will be slow in the next tick
    ifSlow: function (callback, ctx, params) {
      if (mouse.isSlow()) {
        callback.apply(ctx || global, params || []);
      } else {
        ifSlowCallbacks.push({
          fn: callback,
          ctx: ctx,
          params: params,
          called: 0
        });
      }
    },
    // complete mouseover/mouseout replacement
    // TODO event delegation
    over: function (el, overCB, outCB) {
      el.addEventListener('mouseover', function (e) {
        el.setAttribute(mouse.dataAttr, 'over');
      });
      el.addEventListener('mouseout', function (e) {
        if (el.getAttribute(mouse.dataAttr) === 'active') {
          outCB.apply(el, [e]);
        }
        el.setAttribute(mouse.dataAttr, 'out');
      });
      el.addEventListener('mousemove', function (e) {
        if (el.getAttribute(mouse.dataAttr) !== 'active') {
          MouseSpeed.ifSlow(function (eData) {
            if (el.getAttribute(mouse.dataAttr) === 'over') {
              el.setAttribute(mouse.dataAttr, 'active');
              overCB.apply(el, [eData]);
            }
          }, el, [{
            currentTarget: e.currentTarget,
            path: e.path,
            srcElement: e.srcElement,
            target: e.target
          }]);
        }
      });
    }
  };
  
  document.addEventListener("mousemove", function(e) {
    mouse.lastX = mouse.x;
    mouse.lastY = mouse.y;
    mouse.x = e.pageX;
    mouse.y = e.pageY;
    mouse.lastDistance += Math.sqrt(Math.pow(mouse.x-mouse.lastX, 2) + Math.pow(mouse.y-mouse.lastY, 2));
  });

  var mouseInterval = function () {
    var now = new Date().getTime();

    if (mouse.lastTime && mouse.lastTime !== now) {
      mouse.speed = mouse.lastDistance / (now - mouse.lastTime) * 1000;
      mouse.lastDistance = 0;
    }

    if (ifSlowCallbacks.length) {
      if (mouse.isSlow()) {
        // call ifSlowCallbacks
        ifSlowCallbacks.forEach(function (cbo) {
          cbo.fn.apply(cbo.ctx || global, cbo.params || []);
        });
        ifSlowCallbacks = [];
      } else {
        // update & clear callbacks
        ifSlowCallbacks = ifSlowCallbacks.map(function (cbo) {
          cbo.called++;
          return cbo;
        }).filter(function (cbo) {
          return cbo.called < mouse.tryCallback;
        });
      }
    }

    mouse.lastTime = now;
    requestAnimFrame(mouseInterval);

    debug("Mouse speed: "+ mouse.speed);
  };
  mouseInterval();

  global.MouseSpeed = mouse;
}(window));
