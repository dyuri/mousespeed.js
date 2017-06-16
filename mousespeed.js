"use strict";

(function (global) {
  // requestAnimationFrame polyfill
  var requestAnimFrame = (function(){
    return window.requestAnimationFrame ||
           window.webkitRequestAnimationFrame ||
           window.mozRequestAnimationFrame ||
           function( callback ){
             window.setTimeout(callback, 1000 / 60);
           };
  })();

  // CustomEvent polyfill
  if (!window.CustomEvent || typeof window.CustomEvent !== 'function') {
    try {
      (function () {
        function CustomEvent (event, params) {
          params = params || {
            bubbles: false,
            cancelable: false,
            detail: null
          };
          var evt = document.createEvent('CustomEvent');
          evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
          return evt;
        }

        CustomEvent.prototype = window.Event.prototype;

        window.CustomEvent = CustomEvent;
      }());
    } catch (e) {
      console.log('[mousespeed] custom event initialization failed:', e);
    }
  }

  var ifSlowCallbacks = [];
  var mouse;
  var debug = function (message) {
    if (mouse.debug) {
      console.debug('[mousespeed] '+message);
    }
  };

  mouse = {
    x: 0,
    y: 0,
    lastX: 0,
    lastY: 0,
    lastTime: new Date().getTime(),
    lastDistance: 0,
    speed: 0,
    direction: null,
    lastDirection: null,
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
    // complete mouseover/mouseout replacement (for old browsers, use mouseslow event instead)
    over: function (el, overCB, outCB) {
      el.addEventListener('mouseover', function () {
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
          mouse.ifSlow(function (eData) {
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
    mouse.stayEl = e.target;
    mouse.lastStayEl = null;
    mouse.lastX = mouse.x;
    mouse.lastY = mouse.y;
    mouse.x = e.pageX;
    mouse.y = e.pageY;
    mouse.startX = mouse.startX || mouse.x;
    mouse.startY = mouse.startY || mouse.y;
    mouse.lastDistance += Math.sqrt(Math.pow(mouse.x-mouse.lastX, 2) + Math.pow(mouse.y-mouse.lastY, 2));
  });

  document.addEventListener("mouseover", function(e) {
    mouse.overEl = e.target;
  });

  var mouseInterval = function () {
    var now = new Date().getTime();

    if (mouse.lastTime && mouse.lastTime !== now) {
      mouse.speed = mouse.lastDistance / (now - mouse.lastTime) * 1000;
      mouse.lastDistance = 0;
    }

    // calculate direction of "quick" movements between slow movements
    if (mouse.isSlow()) {
      if (mouse.y && mouse.x && mouse.startX && mouse.startY && Math.abs(mouse.startX - mouse.x) + Math.abs(mouse.startY - mouse.y) > 10) {
        var direction = Math.atan2(mouse.y - mouse.startY, mouse.x - mouse.startX) * 180 / Math.PI;
        if (direction || direction === 0) {
          mouse.direction = direction;
        }
        mouse.startX = mouse.x;
        mouse.startY = mouse.y;
      }
    }

    // dispatch mouseslow event
    if (window.CustomEvent && mouse.isSlow() && mouse.overEl) {
      if (mouse.overEl !== mouse.lastOverEl) {
        mouse.lastOverEl = mouse.overEl;

        var overevent = new CustomEvent("mouseoverslow", {
          bubbles: true,
          cancelable: true,
          detail: {
            mouse: mouse
          }
        });
        mouse.overEl.dispatchEvent(overevent);
      }

      if (mouse.lastDirection !== mouse.direction) {
        mouse.lastDirection = mouse.direction;

        var moveevent = new CustomEvent("mousemoveslow", {
          bubbles: true,
          cancelable: true,
          detail: {
            mouse: mouse
          }
        });
        mouse.overEl.dispatchEvent(moveevent);
      }

      if (mouse.speed === 0 && mouse.lastStayEl !== mouse.stayEl) {
        mouse.lastStayEl = mouse.stayEl;

        var stayevent = new CustomEvent("mouseidle", {
          bubbles: true,
          cancelable: true,
          detail: {
            mouse: mouse
          }
        });
        mouse.stayEl.dispatchEvent(stayevent);
      }
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
