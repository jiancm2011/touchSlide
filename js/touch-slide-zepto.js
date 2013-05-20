;(function(W, D, $) {
    W.touchSlide = function() {
        var def = {
            //浏览器内核标记，格式如:["webkit", "-webkit-"]
            vendor: function() {
                var obj = {
                        webkit: "webkitTransform",
                        Moz: "MozTransition",
                        O: "OTransform",
                        ms: "msTransform"
                    },
                    style = D.body.style;

                for(key in obj) {
                    if(obj[key] in style) {
                        return [key, "-" + key.toLowerCase() + "-"];
                    }
                }
            }(),

            //是否触摸设备
            isTouch: "ontouchstart" in W
        }, eventType = {
            start: "touchstart",
            move: "touchmove",
            end: "touchend"
        }, funs = {
            translate: function() {
                var vendor = def.vendor,
                    is3d = true,
                    ua = navigator.userAgent;

                if(vendor[0].toLowerCase() == "o") {
                    is3d = false;
                } else if(vendor[0].toLowerCase() == "ms" && ua.match(/MSIE\s(\S+);/gi) && parseInt(RegExp.$1) < 10) {
                    is3d = false;
                } else if(ua.match(/android\s(\S+);/gi) && parseInt(RegExp.$1) < 3) {
                    is3d = false;
                }

                if(is3d) {
                    return function(x, y, z) {
                        return "translate3d(" + x + ", " + y + ", " + z + ")";
                    };
                } else {
                    return function(x, y) {
                        return "translate(" + x + ", " + y + ")";
                    };
                }

            }(),
            transform: function(elem, str) {
                elem.style[def.vendor[0] + "Transform"] = str;
                return elem;
            },
            transition: function(elem) {
                var str = "";
                if(arguments.length > 1) {
                    str = [].slice.call(arguments, 1).join(",");
                }
                elem.style[def.vendor[0] + "Transition"] = str;
                return elem;
            },
            client: function(e, path) {
                var str = "client" + path;
                if(def.isTouch) {
                    funs.client = function(e, path) {
                        var str = "client" + path;
                        return e.targetTouches[0][str];
                    }
                    return e.targetTouches[0][str];
                } else {
                    funs.client = function(e, path) {
                        var str = "client" + path;
                        return e[str];
                    }
                    return e[str];
                }

            }
        };

        if(!def.isTouch) {
            eventType.start = "mousedown";
            eventType.move = "mousemove";
            eventType.end = "mouseup";
        }

        function event(opt) {

            var $pointer = opt.$pointer,
                $box = opt.$box,
                $blocks = $box.children(),
                blocksLength = $blocks.length, //滑块数量
                curClass = opt.curClass,
                percent = 100 / blocksLength,
                width = D.documentElement.clientWidth,
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
                highlightPointer = function() {};

            function sliderEffect() {
                highlightPointer();
                opt.touchEndFun(opt, cur);
                funs.transition($box[0], transitionStr);
                funs.transform($box[0], funs.translate(-cur * percent + "%", 0, 0));
            }

            if($pointer) {
                var $points = $pointer.children();

                $points.each(function(index) {
                    $points.eq(index).attr("data-index", index);
                }).eq(0).addClass(curClass);

                highlightPointer = function() {
                    $points.filter("." + curClass).removeClass(curClass);
                    $points.eq(cur).addClass(curClass);
                };

                $points.on("click", function() {
                    var $self = $(this);
                    if($self.hasClass(curClass)) return;
                    cur = $self.attr("data-index");
                    sliderEffect();
                });
            }

            var autoSlide = function() {
                if(opt.isPlay) {
                    var interval = null; //循环播放 计时器对象
                    return {
                        play: function() {
                            this.stop();
                            interval = setInterval(function() {
                                ++cur < blocksLength || (cur = 0);
                                sliderEffect();
                            }, opt.playInterval);
                        },
                        stop: function() {
                            clearInterval(interval);
                        }
                    }
                } else {
                    return {
                        play: function() {},
                        stop: function() {}
                    }
                }
            }();

            $box[0].addEventListener(eventType.start, function(e) {
                isBegin = true;
                x = y = 0;
                isXY = 0;
                sX = funs.client(e, "X");
                sY = funs.client(e, "Y");
                funs.transition(this, "");
                !def.isTouch && e.preventDefault();
                autoSlide.stop();
            }, false);

            $box[0].addEventListener(eventType.move, function(e) {
                if (!isBegin) {
                    return;
                }
                isMove = true;
                var tempX = funs.client(e, "X"),
                    tempY = funs.client(e, "Y");
                dX = tempX - sX;
                dY = tempY - sY;
                sX = tempX;
                sY = tempY;
                x += dX;
                y += dY;
                isXY == 0 && (isXY = Math.abs(dX) > Math.abs(dY) ? -1 : 1);
                if(isXY == 1) {
                    isBegin = false;
                    return;
                }
                e.preventDefault();
                funs.transform(this, funs.translate((x / width  - cur) * percent + "%", 0, 0));
            }, false);

            $box[0].addEventListener(eventType.end, function(e) {
                if(!isBegin) {
                    return isBegin = isMove = false;
                } else if(!isMove) {
                    autoSlide.play();
                    return isBegin = isMove = false;
                }

                if (x > slideDistance) {
                    cur = cur === 0 ? 0 : cur - 1;
                } else if (x < -slideDistance) {
                    cur = cur === blocksLength - 1 ? blocksLength - 1 : cur + 1;
                }
                sliderEffect();
                autoSlide.play();
                isBegin = isMove = false;
            }, false);

            autoSlide.play();
        }

        return function(o) {
            var opt = {
                $box: null, //内容盒子的$对象 [必需]
                $pointer: null,  //指针的$对象 [可选]
                curClass: "cur", //设置被选中tabs的类名，缺省值:"cur" [可选]
                isPlay: true,   //是否自动播放，缺省值:true [可选]
                playInterval: 5000,  //动画自动播放的切换间隔时间，缺省值:5000ms [可选]
                touchEndFun: function() {}  //手指离开屏幕后触发的回调
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