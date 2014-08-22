(function (global) {

  var mouseRefresh = 20; // max ~50 Hz refresh rate
  var mouse = {
    x: 0,
    y: 0,
    lastX: 0,
    lastY: 0,
    lastTime: new Date().getTime(),
    lastDistance: 0,
    speed: 0,
    slowLimit: 200, // under px/sec
    isSlow: function () { return mouse.speed < mouse.slowLimit; }
  };
  
  document.addEventListener("mousemove", function(e) {
    mouse.lastX = mouse.x;
    mouse.lastY = mouse.y;
    mouse.x = e.pageX;
    mouse.y = e.pageY;
    mouse.lastDistance += Math.sqrt(Math.pow(mouse.x-mouse.lastX, 2) + Math.pow(mouse.y-mouse.lastY, 2));
  });

  // TODO requestAnimationFrame
  var mouseInterval = setInterval(function () {
    var now = new Date().getTime();

    if (mouse.lastTime && mouse.lastTime !== now) {
      mouse.speed = mouse.lastDistance / (now - mouse.lastTime) * 1000;
      mouse.lastDistance = 0;
    }

    mouse.lastTime = now;
  }, mouseRefresh);

  global.MouseSpeed = mouse;
}(window));
