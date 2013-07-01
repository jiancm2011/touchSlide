/**
 * 依赖 jQuery.js 或 Zepto.js
 * */

;(function (W, D, $) {
    W.touchSlide = function () {
        var def = {
            //浏览器内核标记，格式如:["webkit", "-webkit-"]
            vendor: function () {
                var obj = {
                        webkit: "webkitTransform",
                        Moz: "MozTransition",
                        O: "OTransform",
                        ms: "msTransform"
                    },
                    style = D.body.style;

                for (key in obj) {
                    if (obj[key] in style) {
                        return [key, "-" + key.toLowerCase() + "-"];
                    }
                }
                return ["", ""];
            }(),

            //是否触摸设备
            isTouch: "ontouchstart" in W
        }, eventType = {
            start: "touchstart",
            move: "touchmove",
            end: "touchend"
        }, fns = {
            translate: function () {
                var vendor = def.vendor,
                    is3d = true,
                    ua = navigator.userAgent;

                if (vendor[0].toLowerCase() === "o") {
                    is3d = false;
                } else if (vendor[0].toLowerCase() === "ms" && ua.match(/MSIE\s(\S+);/gi) && parseInt(RegExp.$1) < 10) {
                    is3d = false;
                } else if (ua.match(/android\s(\S+);/gi) && parseInt(RegExp.$1) < 3) {
                    is3d = false;
                }

                if (is3d) {
                    return function (x, y, z) {
                        return "translate3d(" + x + ", " + y + ", " + z + ")";
                    };
                } else {
                    return function (x, y) {
                        return "translate(" + x + ", " + y + ")";
                    };
                }

            }(),
            transform: function (elem, str) {
                elem.style[def.vendor[0] + "Transform"] = str;
                return elem;
            },
            transition: function (elem) {
                var str = "";
                if (arguments.length > 1) {
                    str = [].slice.call(arguments, 1).join(",");
                }
                elem.style[def.vendor[0] + "Transition"] = str;
                return elem;
            },
            client: function (e, path) {
                var str = "client" + path;
                if (def.isTouch) {
                    fns.client = function (e, path) {
                        var str = "client" + path;
                        return e.targetTouches[0][str];
                    }
                    return e.targetTouches[0][str];
                } else {
                    fns.client = function (e, path) {
                        var str = "client" + path;
                        return e[str];
                    }
                    return e[str];
                }

            }
        };

        if (!def.isTouch) {
            eventType.start = "mousedown";
            eventType.move = "mousemove";
            eventType.end = "mouseup";
        }

        function event(opt) {

            var $pointer = opt.$pointer,
                $box = opt.$box,
                $leftBtn = opt.$leftBtn,
                $rightBtn = opt.$rightBtn,
                $blocks = $box.children(),
                blocksLength = $blocks.length, //滑块数量
                curClass = opt.curClass,
                percent = 100 / blocksLength,
                width = $blocks.width(),
                slideDistance = width / 5, //有效滑动距离（触发滑块切换）
                cur = 0, //当前滑块标识
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
                transitionStr = def.vendor[1] + "transform " + SPEED + "s ease-in",
                startCallback = opt.start,
                moveCallback = opt.move,
                endCallback = opt.end,
                aniStartCallback = opt.animatestart,
                checkBtnStatus = function () {},
                highlightPointer = function () {},
                slideAnimate = function () {},
                moveSlider = function () {};


            if(def.vendor[0] + "Transition" in document.body.style) {
                slideAnimate = function ($this) {
                    fns.transition($this[0], transitionStr);
                    fns.transform($this[0], fns.translate(-cur * percent + "%", 0, 0));
                };
                moveSlider = function ($this, x) {
                    fns.transform($this[0], fns.translate((x / width  - cur) * percent + "%", 0, 0));
                };
            } else {
                slideAnimate = function ($this) {
                    $this.animate({
                        "margin-left": -cur * 100 + "%"
                    }, SPEED * 1000);
                };
                moveSlider = function ($this, x) {
                    $this.css("margin-left", (x / width  - cur) * 100 + "%");
                };
            }

            $box.on("animatestart", function (e, opt, cur) {
                highlightPointer();
                checkBtnStatus("disabled");
                aniStartCallback(opt, cur);
                slideAnimate($(this));
            });

            // 判断是否有$pointer模块
            if ($pointer && $pointer.length) {
                var $points = $pointer.children();

                $points.each(function (index) {
                    $points.eq(index).attr("data-index", index);
                }).eq(0).addClass(curClass);

                highlightPointer = function () {
                    $points.filter("." + curClass).removeClass(curClass);
                    $points.eq(cur).addClass(curClass);
                };

                $points.on("click", function () {
                    var $self = $(this);
                    if ($self.hasClass(curClass)) return;
                    cur = parseInt($self.attr("data-index"));
                    $box.trigger("animatestart", [opt, cur]);
                });
            }

            // 判断是否有 $leftBtn 和 $rightBtn 模块
            if ($leftBtn && $rightBtn && $leftBtn.length && $rightBtn.length) {
                checkBtnStatus = function (klass) {
                    if (cur === 0) {
                        $leftBtn.addClass(klass);
                        $rightBtn.removeClass(klass);
                    } else if (cur === blocksLength -1) {
                        $leftBtn.removeClass(klass);
                        $rightBtn.addClass(klass);
                    } else {
                        $leftBtn.removeClass(klass);
                        $rightBtn.removeClass(klass);
                    }
                };

                $leftBtn.addClass("disabled").on("click", function () {
                    if (cur > 0) {
                        cur--;
                        $box.trigger("animatestart", [opt, cur]);
                    }
                });

                $rightBtn.on("click", function () {
                    if (cur < blocksLength - 1) {
                        cur++;
                        $box.trigger("animatestart", [opt, cur]);
                    }
                });
            }

            var autoSlide = function () {
                if (opt.isPlay) {
                    var interval = null; //循环播放 计时器对象
                    return {
                        play: function () {
                            this.stop();
                            interval = setInterval (function () {
                                ++cur < blocksLength || (cur = 0);
                                $box.trigger("animatestart", [opt, cur]);
                            }, opt.playInterval);
                        },
                        stop: function () {
                            clearInterval(interval);
                        }
                    }
                } else {
                    return {
                        play: function () {},
                        stop: function () {}
                    }
                }
            }();

            $box.on(eventType.start, function (e) {
                isBegin = true;
                x = y = 0;
                isXY = 0;
                sX = fns.client(e, "X");
                sY = fns.client(e, "Y");
                fns.transition(this, "");
                !def.isTouch && e.preventDefault();
                autoSlide.stop();
                startCallback(opt, cur);
            });

            $box.on(eventType.move, function (e) {
                if (!isBegin) {
                    return;
                }
                isMove = true;
                var tempX = fns.client(e, "X"),
                    tempY = fns.client(e, "Y");
                dX = tempX - sX;
                dY = tempY - sY;
                sX = tempX;
                sY = tempY;
                x += dX;
                y += dY;
                isXY == 0 && (isXY = Math.abs(dX) > Math.abs(dY) ? -1 : 1);
                if (isXY == 1) {
                    isBegin = false;
                    return;
                }
                e.preventDefault();
                //fns.transform(this, fns.translate((x / width  - cur) * percent + "%", 0, 0));
                moveSlider($(this), x);
                moveCallback(opt, cur);
            });

            $box.on(eventType.end, function (e) {
                if (!isBegin) {
                    endCallback(opt, cur);
                    return isBegin = isMove = false;
                } else if (!isMove) {
                    endCallback(opt, cur);
                    autoSlide.play();
                    return isBegin = isMove = false;
                }

                if (x > slideDistance) {
                    cur = cur === 0 ? 0 : cur - 1;
                } else if (x < -slideDistance) {
                    cur = cur === blocksLength - 1 ? blocksLength - 1 : cur + 1;
                }
                endCallback(opt, cur);
                $box.trigger("animatestart", [opt, cur]);
                autoSlide.play();
                isBegin = isMove = false;
            });

            autoSlide.play();
        }

        return function (o) {
            var opt = {
                $box: null,                             // 内容盒子的$对象 [必需]
                $pointer: null,                         // 指针的$对象 [可选]
                $leftBtn: null,                         // 左边按钮的$对象 [可选]
                $rightBtn: null,                        // 右边按钮的$对象 [可选]
                curClass: "cur",                        // 设置被选中tabs的类名，缺省值:"cur" [可选]
                isPlay: true,                           // 是否自动播放，缺省值:true [可选]
                playInterval: 5000,                     // 动画自动播放的切换间隔时间，缺省值:5000ms [可选]
                start: function (opt, cur) {},          // touchstart触发的回调
                move: function (opt, cur) {},           // touchmove触发的回调
                end: function (opt, cur) {},            // touchend触发的回调
                animatestart: function (opt, cur) {}    // 动画开始时触发的回调
            };

            $.extend(opt, o);

            var $box = opt.$box,
                $blocks = $box.children(),
                blocksLength = $blocks.length,
                slideBlocksWidth = 100 / blocksLength + "%";

            $box.css("width", blocksLength * 100 + "%");
            $blocks.css("width", slideBlocksWidth);

            event(opt);
            return opt;
        };
    }();

})(window, document, $);