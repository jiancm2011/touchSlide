/**
 * 依赖 jQuery.js 或 Zepto.js
 * */

;(function (W, D, $) {
    W.touchSlideLoop = function () {
        var def = {};
        // 浏览器内核标记，格式如:['webkit', '-webkit-']
        def.vendor = function () {
            var obj = {
                    webkit: 'webkitTransform',
                    Moz: 'MozTransition',
                    O: 'OTransform',
                    ms: 'msTransform'
                },
                style = D.body.style,
                key;

            for (key in obj) {
                if (obj[key] in style) {
                    return [key, '-' + key.toLowerCase() + '-'];
                }
            }
            return ['', ''];
        }();
        // 是否触摸设备
        def.isTouch = 'ontouchstart' in W;
        // 是否支持transition属性
        def.hasTransition = def.vendor[0] + 'Transition' in D.body.style;

        // 事件类别
        var eventType = {};
        if (!def.isTouch) {
            eventType.start = 'mousedown';
            eventType.move = 'mousemove';
            eventType.end = 'mouseup';
        } else {
            eventType.start = 'touchstart';
            eventType.move = 'touchmove';
            eventType.end = 'touchend';
        }

        // 通用方法
        var fns = {
            translate: function () {
                var vendor = def.vendor,
                    is3d = true,
                    ua = navigator.userAgent;

                if (vendor[0].toLowerCase() === 'o') {
                    is3d = false;
                } else if (vendor[0].toLowerCase() === 'ms' && ua.match(/MSIE\s(\S+);/gi) && parseInt(RegExp.$1) < 10) {
                    is3d = false;
                } else if (ua.match(/android\s(\S+);/gi) && parseInt(RegExp.$1) < 3) {
                    is3d = false;
                }

                if (is3d) {
                    return function (x, y, z) {
                        return 'translate3d(' + x + ', ' + y + ', ' + z + ')';
                    };
                } else {
                    return function (x, y) {
                        return 'translate(' + x + ', ' + y + ')';
                    };
                }

            }(),
            transform: function (elem, str) {
                elem.style[def.vendor[0] + 'Transform'] = str;
                return elem;
            },
            transition: function (elem) {
                var str = '';
                if (arguments.length > 1) {
                    str = [].slice.call(arguments, 1).join(',');
                }
                elem.style[def.vendor[0] + 'Transition'] = str;
                return elem;
            },
            client: function (e, path) {
                if (def.isTouch) {
                    // jQuery.Event 没有 targetTouches 的对象
                    fns.client = function (e, path) {
                        var event = e.originalEvent ? e.originalEvent : e,
                            str = 'client' + path;
                        return event.targetTouches[0][str];
                    };
                } else {
                    fns.client = function (e, path) {
                        var str = 'client' + path;
                        return e[str];
                    };
                }
                return fns.client(e, path);
            }
        };

        // 支持监听的数据类型
        function NumberData(n) {
            var _$obj = $('<div></div>'),
                _num = n || 0;

            this.get = function () {
                return _num;
            };

            this.set = function (n) {
                _num = n;
                _$obj.triggerHandler('change', [_num]);
                return _num;
            };

            this.add = function (n) {
                var num = this.get();
                return this.set(num + n);
            };

            this.on = function (eventType, callback) {
                _$obj.on(eventType, function (e, num) {
                    callback(e, num);
                });
            };
        }

        // 时间绑定
        function event(opt) {

            var $pointer = opt.$pointer,
                $box = opt.$box,
                $leftBtn = opt.$leftBtn,
                $rightBtn = opt.$rightBtn,
                $blocks = $box.children(),

                blocksLength = $blocks.length, //滑块数量
                curClass = opt.curClass,
                divisibleNum = opt._divisibleNum,   //大于或等于blocksLength的可把100除尽的数
                percent = 100 / divisibleNum,
                width = $blocks.width(),
                slideDistance = width / 5, //有效滑动距离（触发滑块切换）
                cur = new NumberData(0), // 当前滑块标识(视觉)
                curPointer = new NumberData(1), // 当前滑块标识(指针)
                x = 0,  //存储一次完整move的距离X
                y = 0,  //存储一次完整move的距离Y
                dX = 0, //触摸移动距离X
                dY = 0, //触摸移动距离Y
                sX = 0, //触摸起点X
                sY = 0, //触摸起点Y
                isXY = 0, //记录手指移动主方向，1为Y(上下)，-1为X(左右)，0为未初始化
                isBegin = false, //判断start事件是否开始
                isMove = false, //判断move事件是否开始
                SPEED = 0.3, //动画速度
                transitionStr = def.vendor[1] + 'transform ' + SPEED + 's ease-in',

                startCallback = opt.start,
                moveCallback = opt.move,
                endCallback = opt.end,

                aniStartCallback = opt.animatestart,
                aniEndCallback = opt.animateend,

                setPosition = function () {},
                resetPosition = function () {},
                highlightPointer = function () {},
                slideAnimate = function () {};


            // 对curPointer做监听，当curPointer的值变化时，会改变cur的值
            curPointer.on('change', function (e, num) {
                if (num <= 0) {
                    cur.set(blocksLength - 2);
                } else if (num >= blocksLength - 1) {
                    cur.set(0);
                } else {
                    cur.set(num - 1);
                }
            });

            // 重置当前位置
            // TODO 窗口不是当前时，计时器没有停止，但动画被停止了
            resetPosition = function($this) {
                if (curPointer.get() <= 0) {
                    curPointer.set(blocksLength - 2);
                } else if (curPointer.get() >= blocksLength - 1) {
                    curPointer.set(1);
                }
                setPosition($this, 0);
                highlightPointer();
            };

            // 根据transition属性的支持情况，对setPosition和slideAnimate进行重定义
            if (def.hasTransition) {
                setPosition = function ($this, x) {
                    fns.transform($this[0], fns.translate((x / width  - curPointer.get()) * percent + '%', 0, 0));
                };
                slideAnimate = function ($this) {
                    var endEvent = $.fx.transitionEnd || 'transitionend';
                    function end(e) {
                        var _self = e.target;
                        fns.transition(_self, '');
                        aniEndCallback(opt, cur.get());
                        $(_self).off(endEvent, end);
                        resetPosition($this);
                        return false;
                    }
                    slideAnimate = function ($this) {
                        $this.on(endEvent, end);
                        fns.transition($this[0], transitionStr);
                        fns.transform($this[0], fns.translate(-curPointer.get() * percent + '%', 0, 0));
                    };
                    slideAnimate($this);
                };
            } else {
                setPosition = function ($this, x) {
                    $this.css('margin-left', (x / width  - curPointer.get()) * 100 + '%');
                };
                slideAnimate = function ($this) {
                    $this.animate({
                        'margin-left': -curPointer.get() * 100 + '%'
                    }, SPEED * 1000, 'linear', function () {
                        aniEndCallback(opt, cur.get());
                        resetPosition($this);
                    });
                };
            }

            $box.on('animatestart', function (e) {
                aniStartCallback(opt, cur.get());
                slideAnimate($(this));
            });

            // 判断是否有$pointer模块
            if ($pointer && $pointer.length) {
                var $points = $pointer.children();

                $points.each(function (index) {
                    $points.eq(index).attr('data-index', index);
                }).eq(0).addClass(curClass);

                highlightPointer = function () {
                    $points.filter('.' + curClass).removeClass(curClass);
                    $points.eq(cur.get()).addClass(curClass);
                };

                $points.on('click', function () {
                    var $self = $(this);
                    if ($self.hasClass(curClass)) return;
                    curPointer.set(parseInt($self.attr('data-index')) + 1);
                    $box.triggerHandler('animatestart', []);
                });
            }

            $.extend(opt, {
                next: function () {
                    if (curPointer.get() < blocksLength - 1) {
                        //cur++;
                        curPointer.add(1);
                        $box.triggerHandler('animatestart', []);
                    }
                },
                prev: function () {
                    if (curPointer.get() > 0) {
                        //cur--;
                        curPointer.add(-1);
                        $box.triggerHandler('animatestart', []);
                    }
                }
            });

            // 判断是否有 $leftBtn 和 $rightBtn 模块
            if ($leftBtn && $rightBtn && $leftBtn.length && $rightBtn.length) {
                $leftBtn.on('click', opt.prev);
                $rightBtn.on('click', opt.next);
            }

            var autoSlide = function () {
                var play = function () {},
                    stop = function () {},
                    interval = null;    //循环播放 计时器对象

                if (opt.isPlay) {
                    play = function () {
                        this.stop();
                        interval = W.setInterval(function () {
                            //++cur < blocksLength || (cur = 0);
                            curPointer.add(1) < blocksLength || (curPointer.set(0));
                            $box.triggerHandler('animatestart', []);
                        }, opt.playInterval);
                    };

                    stop = function () {
                        W.clearInterval(interval);
                    };
                }

                return {
                    play: play,
                    stop: stop
                };
            }();

            $box.on(eventType.start, function (e) {
                isBegin = true;
                x = y = 0;
                isXY = 0;
                sX = fns.client(e, 'X');
                sY = fns.client(e, 'Y');
                !def.isTouch && e.preventDefault(); // 如果是鼠标事件，把鼠标自带的drag功能清除
                autoSlide.stop();
                startCallback(opt, cur.get());
            });

            $box.on(eventType.move, function (e) {
                if (!isBegin) {
                    return true;
                }
                isMove = true;
                var tempX = fns.client(e, 'X'),
                    tempY = fns.client(e, 'Y');
                dX = tempX - sX;
                dY = tempY - sY;
                sX = tempX;
                sY = tempY;
                x += dX;
                y += dY;
                isXY == 0 && (isXY = Math.abs(dX) > Math.abs(dY) ? -1 : 1);
                if (isXY == 1) {
                    isBegin = false;
                    return true;
                }
                e.preventDefault();
                setPosition($(this), x);
                moveCallback(opt, cur.get());
                return false;   // 禁止冒泡，避免嵌套多个slider导致事件冲突
            });

            $box.on(eventType.end, function (e) {
                if (!isBegin) {
                    endCallback(opt, cur.get());
                } else if (!isMove) {
                    endCallback(opt, cur.get());
                    autoSlide.play();
                } else {
                    if (x > slideDistance) {
                        //cur = cur === 0 ? 0 : cur - 1;
                        curPointer.get() === 0 ? curPointer.set(0) : curPointer.add(-1);
                    } else if (x < -slideDistance) {
                        //cur = cur === blocksLength - 1 ? blocksLength - 1 : cur + 1;
                        curPointer.get() === blocksLength - 1 ? curPointer.set(blocksLength - 1) : curPointer.add(1);
                    }
                    endCallback(opt, cur.get());
                    $box.triggerHandler('animatestart', []);
                    autoSlide.play();
                }
                isBegin = isMove = false;
            });

            autoSlide.play();
        }

        // 初始化
        function init(opt) {
            var _opt = {
                $box: null,                             // 内容盒子的$对象 [必需]
                $pointer: null,                         // 指针的$对象 [可选]
                $leftBtn: null,                         // 左边按钮的$对象 [可选]
                $rightBtn: null,                        // 右边按钮的$对象 [可选]
                curClass: 'cur',                        // 设置被选中tabs的类名，缺省值:'cur' [可选]
                isPlay: true,                           // 是否自动播放，缺省值:true [可选]
                playInterval: 5000,                     // 动画自动播放的切换间隔时间，缺省值:5000ms [可选]
                start: function (opt, cur) {},          // touchstart触发的回调 [可选]
                move: function (opt, cur) {},           // touchmove触发的回调 [可选]
                end: function (opt, cur) {},            // touchend触发的回调 [可选]
                animatestart: function (opt, cur) {},   // 动画开始时触发的回调 [可选]
                animateend: function (opt, cur) {}      // 动画结束时触发的回调 [可选]
            };

            $.extend(_opt, opt);

            var $box = _opt.$box,
                $blocks = $box.children(),
                blocksLength = $blocks.length;

            // 首尾补充元素，实现循环滑动
            $box.prepend($blocks.eq(blocksLength - 1).clone());
            $box.append($blocks.eq(0).clone());
            $blocks = $box.children();
            blocksLength += 2;

            var divisibleNum = function (num) { //大于或等于blocksLength的可把100除尽的数
                var i = num;
                while(100 % i !== 0) {
                    i++;
                }
                return i;
            }(blocksLength);

            $box.css('width', divisibleNum * 100 + '%');
            $blocks.css('width', 100 / divisibleNum + '%');

            // 重置首图位置
            if (def.hasTransition) {
                fns.transform($box[0], fns.translate(-1 * 100 / divisibleNum + "%", 0, 0));
            } else {
                $box.css("margin-left", -1 * 100 + "%");
            }

            _opt._divisibleNum = divisibleNum;

            return _opt;
        }

        return function (opt) {
            var _opt = init(opt);
            event(_opt);
            return _opt;
        };
    }();

})(window, document, $);
