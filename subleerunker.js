var IS_MOBILE = (typeof window.orientation !== 'undefined');
var RESOLUTION = (window.devicePixelRatio || 1);
var FONT_FAMILY = '"Share Tech Mono", monospace';

var Subleerunker = Game.$extend({

  __name__: 'Subleerunker',

  'class': 'subleerunker',

  width: 320,
  height: 480,
  atlas: 'atlas.json',

  fps: 30,
  difficulty: 0.25,

  setup: function() {
    // Set background color.
    this.renderer.backgroundColor = this.pickColor('background');

    // Reset game state.
    this.reset();

    // Init scores.  Fallback with deprecated cookie names.
    var m = /best-score=(\d+)/.exec(document.cookie) ||
            /my_best_score=(\d+)/.exec(document.cookie);
    this.scores = {
      current: 0,
      localBest: m ? Number(m[1]) : 0,
      worldBest: 100
    };

    // Render scores.
    this.setupHUD();
    this.renderScores();
    this.loadWorldBest();
  },

  setupHUD: function() {
    var panel = $('<div class="panel">').css({
      position: 'absolute',
      right: 5,
      top: 3,
      textAlign: 'right',
      fontSize: 12,
      fontFamily: FONT_FAMILY
    }).html([
      '<form class="owned-world-best" tabindex="1">',
        '<input name="name" type="text" maxlength="3" />',
        '<span class="name"></span>',
        '<span class="score"></span>',
      '</form>',
      '<div class="world-best">',
        '<span class="name"></span>',
        '<span class="score"></span>',
      '</div>',
      '<div class="local-best"></div>',
      '<div class="current-score"></div>'
    ].join('')).appendTo(this.hudElem());
    this.scoreElems = {
      ownedWorldBest: panel.find('>.owned-world-best'),
      worldBest: panel.find('>.world-best'),
      localBest: panel.find('>.local-best'),
      current: panel.find('>.current-score')
    };
    var e = this.scoreElems;

    panel
      .find('>.owned-world-best')
      .css('color', rgb(this.pickColor('owned-world-best')))
    .end()
      .find('>.world-best')
      .css('color', rgb(this.pickColor('world-best')))
    .end()
      .find('>.local-best')
      .css('color', rgb(this.pickColor('local-best')))
    .end()
      .find('>.current')
      .css('color', rgb(this.pickColor('current')));

    var nameCSS = {
      display: 'inline',
      textAlign: 'right',
      fontSize: 12,
      fontFamily: FONT_FAMILY,
      backgroundColor: 'transparent',
      border: 'none',
      borderRadius: 0,
      padding: 0,
      marginRight: '0.5ex',
      textTransform: 'uppercase'
    };
    e.ownedWorldBest.find('input').css(nameCSS)
     .css('color', rgb(this.pickColor('owned-world-best')))
     .val('AAA').hide();
    e.ownedWorldBest.on('focus', function() {
      e.ownedWorldBest.find('.name').hide();
      e.ownedWorldBest.find('input').show().focus().select();
    });
    e.ownedWorldBest.find('input').on('blur', function() {
      e.ownedWorldBest.find('.name').show();
      e.ownedWorldBest.find('input').hide();
    });
    e.ownedWorldBest.find('.name').css(nameCSS).text('BBB');
    e.worldBest.find('.name').css(nameCSS).text('CCC');
    e.ownedWorldBest.find('input').width(e.ownedWorldBest.find('span').width() / RESOLUTION);
  },

  hudElem: function() {
    var elem = this.elem();
    var hudElem = elem.find('>.ui:eq(0)');
    if (!hudElem.length) {
      hudElem = $('<div class="hud">').css({
        position: 'absolute', top: 0, left: 0,
        margin: 0, padding: 0,
        // "100%" makes a layout bug on IE11.
        width: this.width, height: this.height
      });
      elem.append(hudElem);
    }
    this.hudElem = function() { return hudElem; }
    return hudElem;
  },

  zoom: function(scale) {
    this.$super.apply(this, arguments);
    this.hudElem().css('zoom', scale);
  },

  showSplash: function() {
    var Logo = GameObject.$extend({
      width: 148, height: 66,
      anchor: [0.5, 0],
      offset: [this.width / 2, 156],
      fps: 0,
      animations: {'default': {textureNames: ['logo']}},
      animationName: 'default',
    });
    var control = {};
    if (IS_MOBILE) {
      $.extend(control, {
        width: 33, height: 35, animationTextureNames: ['touch-0', 'touch-1']
      });
    } else {
      $.extend(control, {
        width: 65, height: 14, animationTextureNames: ['key-0', 'key-1']
      });
    }
    var Control = GameObject.$extend({
      width: control.width,
      height: control.height,
      anchor: [0.5, 1],
      offset: [this.width / 2, -31],
      fps: 1,
      animations: {'blink': {textureNames: control.animationTextureNames}},
      animationName: 'blink'
    });
    this.logo = new Logo(this);
    this.control = new Control(this);
    var disp = this.disp();
    disp.addChild(this.logo.disp());
    disp.addChild(this.control.disp());
  },

  hideSplash: function() {
    this.logo.kill();
    this.logo.destroy();
    this.control.kill();
    this.control.destroy();
    delete this.logo, this.control;
  },

  handlers: {
    keyLeft: function(press) {
      this.ctx.leftPressed = press;
      this.ctx.rightPrior = false;  // evaluate left first
      if (press) {
        this.ctx.shouldPlay = true;
      }
    },
    keyRight: function(press) {
      this.ctx.rightPressed = press;
      this.ctx.rightPrior = true;  // evaluate right first
      if (press) {
        this.ctx.shouldPlay = true;
      }
    },
    keyShift: function(press, lock) {
      this.ctx.shiftPressed = press;
      this.ctx.shiftLocked = !!lock;
      if (press && lock) {
        this.ctx.shouldPlay = true;
      }
    },
    blur: function() {
      this.ctx.leftPressed = false;
      this.ctx.rightPressed = false;
      this.ctx.shiftPressed = false;
      this.ctx.shiftLocked = false;
    },
    touch: function(touches, eventType) {
      if (eventType === 'start' && touches.length === 3) {
        // Toggle shift by 3 fingers.
        this.handlers.keyShift.call(this, !this.ctx.shiftPressed, true);
        return;
      }
      var pressLeft = false;
      var pressRight = false;
      if (touches.length) {
        var lastTouch = touches[touches.length - 1];
        if (lastTouch.pageX / window.innerWidth < 0.5) {
          pressLeft = true;
        } else {
          pressRight = true;
        }
      }
      this.handlers.keyLeft.call(this, pressLeft);
      this.handlers.keyRight.call(this, pressRight);
    },
    // WASD style
    keyA: function(press) { this.handlers.keyLeft.call(this, press); },
    keyD: function(press) { this.handlers.keyRight.call(this, press); },
    // Vim style
    keyH: function(press) { this.handlers.keyLeft.call(this, press); },
    keyL: function(press) { this.handlers.keyRight.call(this, press); }
  },

  releaseLockedShift: function() {
    if (this.ctx.shiftLocked) {
      this.ctx.shiftPressed = false;
      this.ctx.shiftLocked = false;
    }
  },

  reset: function() {
    this.ctx.shouldPlay = false;
    this.releaseLockedShift();
    this.showSplash();
    delete this.difficulty;
  },

  play: function() {
    this.player = new Subleerunker.Player(this);
    if (this.ctx.shiftPressed) {
      // Hommarju for SUBERUNKER's shift-enter easter egg.
      this.player.acceleration *= 0.25;
      this.releaseLockedShift();
    }
    this.disp().addChild(this.player.disp());
    this.scores.current = 0;
    this.updateScore();
    this.hideSplash();
    this.ctx.random = new Math.seedrandom(this.ctx.randomSeed);
  },

  upScore: function() {
    this.scores.current++;
    this.updateScore();
  },

  updateScore: function(score) {
    if (score !== undefined) {
      this.scores.current = score;
    }
    this.renderScores();
  },

  renderScores: function() {
    var s = this.scores;
    var e = this.scoreElems;
    e.current.text(s.current);
    e.localBest.text(s.localBest <= s.current ? '' : s.localBest);
    e.worldBest.find('.score').text(s.worldBest <= s.current ? '' : s.worldBest);
    e.ownedWorldBest.find('.score').text(s.worldBest <= s.current ? '' : s.worldBest);
  },

  _worldBestReceived: function(data) {
    this.scores.worldBest = Number(data);
    this.renderScores();
  },

  loadWorldBest: function() {
    if (!ctx.worldBestURL) {
      return;
    }
    $.get(ctx.worldBestURL, $.proxy(this._worldBestReceived, this));
  },

  beatWorldBest: function() {
    if (this.scores.current <= this.scores.worldBest) {
      return;
    }
    this._worldBestReceived(this.scores.current);
    if (!ctx.worldBestURL) {
      return;
    }
    if (GameObject.debug) {
      return;
    }
    $.ajax(ctx.worldBestURL, {
      method: 'PUT',
      data: {score: this.scores.current},
      success: $.proxy(this._worldBestReceived, this)
    });
  },

  gameOver: function() {
    this.player.die();

    var cookie;
    if (this.scores.localBest < this.scores.current) {
      this.scores.localBest = this.scores.current;
      // Save local best score in Cookie for a month.
      var expires = new Date();
      expires.setMonth(expires.getMonth() + 1);
      cookie = 'best-score=' + this.scores.localBest + '; '
      cookie += 'expires=' + expires.toUTCString() + '; ';
      cookie += 'path=/';
      document.cookie = cookie;
    }

    this.beatWorldBest();

    // Trigger custom event to track the score by outside.
    $(window).trigger('score', [this.scores.current, !!this.ctx.debug]);
  },

  __update__: function(frame, prevFrame, deltaTime) {
    this.$super.apply(this, arguments);

    this.ctx.slow = (this.ctx.debug && this.ctx.shiftPressed);

    if (!this.player) {
      if (this.ctx.shouldPlay) {
        this.play();
        this.ctx.shouldPlay = false;
        this.rebaseFrame(0);
      }
      return;
    }

    var movements = [[this.ctx.leftPressed, this.player.left],
                     [this.ctx.rightPressed, this.player.right]];
    for (var i = 0; i < 2; ++i) {
      var mov = movements[this.ctx.rightPrior ? 1 - i : i];
      var pressed = mov[0];
      if (pressed) {
        var handler = mov[1];
        handler.call(this.player);
        break;
      }
    }
    if (this.ctx.leftPressed || this.ctx.rightPressed) {
      this.player.forward(deltaTime);
    } else {
      this.player.rest(deltaTime);
    }

    if (!this.player.dead) {
      var deltaFrame = frame - prevFrame;
      for (var i = 0; i < deltaFrame; ++i) {
        if (this.random() < this.difficulty) {
          var flame = new Subleerunker.Flame(this);
          this.disp().addChild(flame.disp());
        }
        this.difficulty *= 1.001;
      }
    } else {
      var done = true;
      $.each(this.children, function() {
        done = false;
        return false;
      });
      if (done) {
        delete this.player;
        this.reset();
      }
    }
  }
});

$.extend(Subleerunker, {

  Player: GameObject.$extend({

    __name__: 'Player',

    __init__: function(parent) {
      this.$super.apply(this, arguments);
      this.position = parent.width / 2 - this.width / 2;
      this.updatePosition();
    },

    __update__: function(frame, prevFrame, deltaTime) {
      this.$super.apply(this, arguments);
      if (this.blink.frame !== frame) {
        this.blink = {frame: frame, active: this.random() < 0.02};
      }
      if (this.dead) {
        if (this.animationEnds()) {
          this.kill();
        }
      } else if (this.speed) {
        this.updatePosition(deltaTime);
      }
    },

    /* Animation */

    fps: 12,
    animations: {
      idle: {textureNames: [
        'player-idle-0', 'player-idle-1', 'player-idle-2', 'player-idle-3',
        'player-idle-4', 'player-idle-5', 'player-idle-6'
      ]},
      run: {textureNames: [
        'player-run-0', 'player-run-1', 'player-run-2', 'player-run-3',
        'player-run-4', 'player-run-5', 'player-run-6', 'player-run-7'
      ]},
      die: {textureNames: [
        'player-die-0', 'player-die-1', 'player-die-2', 'player-die-3',
        'player-die-4', 'player-die-5', 'player-die-6', 'player-die-7'
      ], once: true}
    },
    animationName: 'idle',

    blink: {frame: 0, active: false},

    updateAnimation: function(anim, index) {
      this.$super.apply(this, arguments);
      this.overlapEyelids(anim, index);
    },

    overlapEyelids: function(anim, index) {
      if (this._eyelids) {
        this._eyelids.visible = false;
      }
      if (this.animationName === 'die') {
        // There's no eyelids for "die" animation.
        return;
      }
      if (this.blink.active) {
        var disp = this.disp();
        var textureName = anim.textureNames[index] + '-eyelids';
        var eyelidsTexture = this._getTexture(textureName);
        if (this._eyelids) {
          this._eyelids.texture = eyelidsTexture;
          this._eyelids.visible = true;
        } else {
          this._eyelids = new PIXI.Sprite(eyelidsTexture);
          disp.addChild(this._eyelids);
        }
        this._eyelids.x = disp.width * -disp.anchor.x;
        this._eyelids.y = disp.height * -disp.anchor.y;
      }
    },

    /* View */

    width: 48,
    height: 72,
    innerPadding: [10, 18, 50],
    anchor: [0, 1],
    offset: [0, -1],

    /* Move */

    acceleration: 3600,
    step: 300,

    setRunAnimation: function(duration) {
      var frame;
      if (this.animationName === 'idle') {
        frame = 0;
      } else if (this.animationName === 'run' && duration !== this.duration) {
        frame = this.animationFrame() + 4;
      }
      var disp = this.disp();
      switch (duration) {
        case -1:
          disp.scale.x = -1;
          disp.anchor.x = 1;
          break;
        case +1:
          disp.scale.x = +1;
          disp.anchor.x = 0;
          break;
      }
      this.setAnimation('run', frame);
    },

    left: function() {
      this.duration = -1;
      this.setRunAnimation(-1);
    },

    right: function() {
      this.duration = +1;
      this.setRunAnimation(+1);
    },

    rest: function(deltaTime) {
      this.$super.apply(this, arguments);
      this.setAnimation('idle');
    },

    updatePosition: function(deltaTime) {
      this.$super.apply(this, arguments);

      var position = this.position;
      var max = this.parent.width - this.width;
      this.position = limit(this.position, 0, max);

      if (position !== this.position) {
        this.speed = 0;
      }

      this.disp().x = this.position;
    },

    /* Own */

    die: function() {
      this.dead = true;
      this.speed = 0;
      this.setAnimation('die');
      this.left = this.right = this.forward = this.rest = $.noop;
    }

  }),

  Flame: GameObject.$extend({

    __name__: 'Flame',

    __init__: function(parent) {
      this.$super.apply(this, arguments);
      var W = parent.width;
      var w = this.width;
      this.xPosition = (W - w * 2) * this.random() + w / 2;
      this.position = -this.height;
    },

    __update__: function(frame, prevFrame, deltaTime) {
      this.$super.apply(this, arguments);
      var player = this.parent.player;

      if (this.landed) {
        if (this.animationEnds()) {
          this.destroy();
          if (!player.dead) {
            this.parent.upScore();
          }
        }
      } else {
        var prevPosition = this.position;
        this.forward(deltaTime);
        this.updatePosition(deltaTime);

        var max = this.parent.height - this.height - this.landingMargin;
        var min = this.parent.height - player.height;

        if (this.position > max) {
          this.position = max;
          this.speed = 0;
          this.updatePosition(deltaTime);
          this.setAnimation('land');
          this.landed = true;
        } else if (this.position < min) {
          return;
        }

        if (!player.dead && this.hits(player, prevPosition)) {
          this.destroy();
          this.parent.gameOver();
        }
      }
    },

    /* View */

    width: 24,
    height: 16,
    innerPadding: [8, 8, 2],
    landingMargin: 2,

    /* Animation */

    animations: {
      burn: {fps: 12, textureNames: [
        'flame-burn-0', 'flame-burn-1', 'flame-burn-2', 'flame-burn-3',
        'flame-burn-4', 'flame-burn-5', 'flame-burn-6'
      ]},
      land: {fps: 24, textureNames: [
        'flame-land-0', 'flame-land-1', 'flame-land-2'
      ], once: true}
    },
    animationName: 'burn',

    /* Move */

    acceleration: 360,
    step: 600,

    updatePosition: function(deltaTime) {
      this.$super.apply(this, arguments);
      var disp = this.disp();
      if (disp) {
        disp.x = this.xPosition;
        disp.y = this.position;
      }
    },

    /* Own */

    hits: function(player, prevPosition) {
      var H = this.parent.height;

      var top = prevPosition + this.innerPadding[TOP];
      var bottom = this.position + this.height - this.innerPadding[2];
      var left = this.xPosition + this.innerPadding[3];
      var right = left + this.innerWidth();

      var pTop = player.height - player.innerPadding[0];
      var pBottom = player.innerPadding[2];
      var pLeft = player.position + player.innerPadding[3];
      var pRight = pLeft + player.innerWidth();

      pTop = H - pTop;
      pBottom = H - pBottom;

      var checkAltitude = top <= pBottom && pTop <= bottom;
      var checkLeft = pLeft <= left && left <= pRight;
      var checkRight = pLeft <= right && right <= pRight;

      return checkAltitude && (checkLeft || checkRight);
    }

  })

});
