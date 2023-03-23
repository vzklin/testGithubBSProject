import Vue from "vue";
import store from "@/store";
import util from "@/a_common/util";
import user from "../store/modules/user";
const isDev = process.env.NODE_ENV === 'development';
/* 总说明:
v-clickOutside://选定元素外部点击时触发
v-longPress://选定元素长按时触发
v-expandClick://元素点击范围扩展指令
v-copy://文本内容复制指令
v-tooltip://元素说明指令
v-ellipsis://文字超出省略指令
v-backtop://回到顶部指令
v-empty://空状态指令,在元素下设置一个空icon的提示
v-badge://徽标指令
v-drag://拖拽指令
v-resize://响应缩放指令
v-format://字符串整形指令
v-debounce://输入框防抖指令
v-banEmoji://禁止表情及特殊字符
v-banInputByRegexp://通过绑定的正则表达式禁止输入
v-waterMarker://页面水印
v-lazyLoad://图片懒加载
v-checkIsCreator://检查是否是数据对象的创建者
v-userTrack://点击埋点指令,通常用于某块点击操作时需要上传数据到服务器
 */
const vueDirectiveCustom = {
  //检查是否是数据对象的创建者
  //例子:
  /* <div v-checkIsCreator="slotProps.tableScope.row"></div> */
  checkIsCreator: {
    update: function (el, binding) {
      let obj = binding.value;
      let flag = obj.createBy == store.state.user.userInfo.loginName;
      if(flag){
        el.removeAttribute("hidden");
      }
      else{
        el.hidden = true;
      }
    },

  },
  //选定元素外部点击时触发
  clickOutside: {
    bind(el, binding, vnode) {
      function documentHandler(e) {
        // el 包含其触发的元素 那当然不能触发啦
        if (el.contains(e.target)) {
          return false;
        }
        // 满足上面条件， 并且expression 的值不为空 触发（希望value是个函数）
        if (binding.expression) {
          //	调用自定义指令传来的函数，e是事件原对象 作为参数（为什么传e 因为有些情况需要把这个对象抛出方便用户的操作）
          //e为"addEventListener"的click鼠标事件对象
          binding.value(e);
        }
      }
      // 嗯？？？ 这么写有什么作用吗？ 当然有了，如果你想取消事件的监听，那么是不是需要这个函数。
      el.__vueClickOutside__ = documentHandler;
      // 在document上监听事件
      document.addEventListener("click", documentHandler);
    },
    update() {},
    unbind(el, binding) {
      // 取消事件监听（el.__vueClickOutside 派上用场了吧）
      document.removeEventListener("click", el.__vueClickOutside__);
      // 既然都取消了 那么这个属性就没必要存在了
      delete el.__vueClickOutside__;
    }
  },
  //选定元素长按时触发
  longPress: {
    bind: function(el, binding, vNode) {
      if (typeof binding.value !== "function") {
        const compName = vNode.context.name;
        let warn = [
          `longpress:`
        ]`provided expression '${binding.expression}' is not afunction, but has to be `;
        if (compName) {
          warn += `Found in component '${compName}'`;
        }
        console.warn(warn);
      }
      // 定义变量
      let pressTimer = null;
      // 定义函数处理程序
      // 创建计时器（ 1秒后执行函数 ）
      let start = e => {
        if (e.type === "click" && e.button !== 0) {
          return;
        }
        if (pressTimer === null) {
          pressTimer = setTimeout(() => {
            // 执行函数
            handler();
          }, 2000);
        }
      };
      // 取消计时器
      let cancel = () => {
        // 检查计时器是否有值
        if (pressTimer !== null) {
          clearTimeout(pressTimer);
          pressTimer = null;
        }
      };
      // 运行函数
      const handler = e => {
        // 执行传递给指令的方法
        binding.value(e);
      };
      // 添加事件监听器
      el.addEventListener("mousedown", start);
      el.addEventListener("touchstart", start);
      // 取消计时器
      el.addEventListener("click", cancel);
      el.addEventListener("mouseout", cancel);
      el.addEventListener("touchend", cancel);
      el.addEventListener("touchcancel", cancel);
    }
  },
  //元素点击范围扩展指令//自带参数,
  //例子:<div v-expandClick="20,30,40,50" @click="glabClickoutside"> 点击范围扩大</div>
  /* 参数	说明	默认值	类型	可选
  top, right, bottom, left	上右下左扩展宽度（逗号分割），
  单位px	10,10,10,10	String	可填 */
  expandClick: {
    bind: function(el, binding) {
      const s = document.styleSheets[document.styleSheets.length - 1];
      const DEFAULT = -10; // 默认向外扩展10px
      const ruleStr = `content:"";position:absolute;top:-${top ||
        DEFAULT}px;bottom:-${bottom || DEFAULT}px;right:-${right ||
        DEFAULT}px;left:-${left || DEFAULT}px;`;
      const [top, right, bottom, left] =
        (binding.expression && binding.expression.split(",")) || [];
      const classNameList = el.className.split(" ");
      el.className = classNameList.includes("expand_click_range")
        ? classNameList.join(" ")
        : [...classNameList, "expand_click_range"].join(" ");
      el.style.position = el.style.position || "relative";
      if (s.insertRule) {
        s.insertRule(
          ".expand_click_range::before" + "{" + ruleStr + "}",
          s.cssRules.length
        );
      } else {
        /* IE */
        s.addRule(".expand_click_range::before", ruleStr, -1);
      }
    }
  },
  //文本内容复制指令
  //例子:<div v-copy> 单击复制 </div>
  // <div v-copy.dblclick> 双击复制 </div>
  // <div v-copy.icon> icon复制 </div>
  /*  */
  copy: {
    bind(el, binding) {
      // 双击触发复制
      if (binding.modifiers.dblclick) {
        el.addEventListener("dblclick", () => handleClick(el.innerText));
        el.style.cursor = "copy";
      }
      // 点击icon触发复制
      else if (binding.modifiers.icon) {
        if (el.hasIcon) return;
        const iconElement = document.createElement("i");
        iconElement.setAttribute("class", "el-icon-document-copy");
        iconElement.setAttribute("style", "margin-left:5px");
        el.appendChild(iconElement);
        el.hasIcon = true;
        iconElement.addEventListener("click", () => handleClick(el.innerText));
        iconElement.style.cursor = "copy";
      }
      // 单击触发复制
      else {
        el.addEventListener("click", () => handleClick(el.innerText));
        el.style.cursor = "copy";
      }

      function handleClick(text) {
        // 创建元素
        if (!document.getElementById("copyTarget")) {
          const copyTarget = document.createElement("input");
          copyTarget.setAttribute(
            "style",
            "position:fixed;top:0;left:0;opacity:0;z-index:-1000;"
          );
          copyTarget.setAttribute("id", "copyTarget");
          document.body.appendChild(copyTarget);
        }

        // 复制内容
        const input = document.getElementById("copyTarget");
        input.value = text;
        input.select();
        document.execCommand("copy");
        // alert('复制成功')
      }
    }
  },
  //元素全屏指令//使用例子v-screenfull.icon
  /* 参数	说明	默认值	类型	可选
  icon	是否添加 icon	/	String	可选 */
  //需要引入screenfull包
  // import screenfull from 'screenfull'
  /* screenfull: {
    bind (el, binding) {
      if (binding.modifiers.icon) {
        if (el.hasIcon) return
        // 创建全屏图标
        const iconElement = document.createElement('i')
        iconElement.setAttribute('class', 'el-icon-full-screen')
        iconElement.setAttribute('style', 'margin-left:5px')
        el.appendChild(iconElement)
        el.hasIcon = true
    }
      el.style.cursor = el.style.cursor || 'pointer'
      // 监听点击全屏事件
      el.addEventListener('click', () => handleClick());
      function handleClick () {
        if (!screenfull.isEnabled) {
          alert('浏览器不支持全屏')
          return
        }
        screenfull.toggle()
      }
    }
  }, */

  //元素说明指令//例子:<div v-tooltip:提示内容为XXX='tootipParams'> 提示2 </div>
  /* 参数	说明	默认值	类型	可选
  content	传给指令的参数。例如 v-tooltip:content 中，参数为 "content" ，tooltip中展示的内容为："content"	/	String	可选
  tootipParams	element-ui 支持的 tooltip 属性	/	Object	可选 */
  tooltip: {
    bind: function(el, binding) {
      if (el.hasIcon) return;
      const iconElement = structureIcon(binding.arg, binding.value);
      el.appendChild(iconElement);
      el.hasIcon = true;
      function structureIcon(content, attrs) {
        // 拼接绑定属性
        let attrStr = "";
        for (let key in attrs) {
          attrStr += `${key}=${attrs[key]} `;
        }
        const a = `<el-tooltip content=${content} ${attrStr}><i class="el-icon-question" style="margin:0 10px"></i></el-tooltip>`;
        // 创建构造器
        const tooltip = Vue.extend({
          template: a
        });
        // 创建一个 tooltip 实例并返回 dom 节点
        const component = new tooltip().$mount();
        return component.$el;
      }
    }
  },
  //文字超出省略指令
  /* 参数	说明	默认值	类型	可选
  width	元素宽度	100	Number	必填 */
  ellipsis: {
    bind: function(el, binding) {
      el.style.width = binding.arg || 100 + "px";
      el.style.whiteSpace = "nowrap";
      el.style.overflow = "hidden";
      el.style.textOverflow = "ellipsis";
    }
  },
  //回到顶部指令//例子<div  v-backtop> 回到顶部 </div>
  /* 参数	说明	默认值	类型	可选
  id	给需要回到顶部的元素添加的id	/	String	可选
  offset	偏移距离为 height 时显示指令绑定的元素	/	Number	可选 */
  backtop: {
    bind(el, binding, vnode) {
      // 响应点击后滚动到元素顶部
      el.addEventListener("click", () => {
        const target = binding.arg
          ? document.getElementById(binding.arg)
          : window;
        target.scrollTo({
          top: 0,
          behavior: "smooth"
        });
      });
    },
    update(el, binding, vnode) {
      // 滚动到达参数值才出现绑定指令的元素
      const target = binding.arg
        ? document.getElementById(binding.arg)
        : window;
      if (binding.value) {
        target.addEventListener("scroll", e => {
          if (e.srcElement.scrollTop > binding.value) {
            el.style.visibility = "unset";
          } else {
            el.style.visibility = "hidden";
          }
        });
      }
      // 判断初始化状态
      if (target.scrollTop < binding.value) {
        el.style.visibility = "hidden";
      }
    },
    unbind(el) {
      const target = binding.arg
        ? document.getElementById(binding.arg)
        : window;
      target.removeEventListener("scroll");
      el.removeEventListener("click");
    }
  },
  //空状态指令,在元素下设置一个空icon的提示
  /* 例子:<div style="height:500px;width:500px" v-empty="{
    content: '暂无列表',
    img: require('../../assets/images/blue_big.png'),
    visible: true,
  },"> 原本内容 */
  /* 参数	说明	默认值	类型	可选
  emptyValue	包含文字内容 content、图片 img、是否显示 visible，仅 visible 必传	/	Object	必须 */
  empty: {
    update(el, binding, vnode) {
      el.style.position = el.style.position || "relative";
      const { offsetHeight, offsetWidth } = el;
      const { visible, content, img } = binding.value;
      const image = img
        ? `<img src="${img}" height="30%" width="30%"></img>`
        : "";
      const defaultStyle =
        "position:absolute;top:0;left:0;z-index:9999;background:#fff;display:flex;justify-content: center;align-items: center;";
      const empty = Vue.extend({
        template: `<div style="height:${offsetHeight}px;width:${offsetWidth}px;${defaultStyle}">
        <div style="text-align:center">
          <div>${image}</div>
          <div>${content || "暂无数据"}</div>
        </div>
      </div>`
      });
      const component = new empty().$mount().$el;
      if (visible) {
        el.appendChild(component);
      } else {
        el.removeChild(el.lastChild);
      }
    }
  },
  //徽标指令
  //例子:<div v-badge.dot.info="badgeCount" style="height:50px;width:50px;background:#999"> </div>
  /* 参数	说明	默认值	类型	可选
  normal、dot	徽标形状normal为正常徽标；dot 仅为一个点	normal	String	可选
  success、error、info、warning	徽标颜色	error	String	可选
  number	徽标上显示的数字	/	Number	可选 */
  badge: {
    update(el, binding, vnode) {
      const { modifiers, value } = binding;
      const modifiersKey = Object.keys(modifiers);
      let isDot = modifiersKey.includes("dot");
      let backgroundColor = "";
      if (modifiersKey.includes("success")) {
        backgroundColor = SUCCESS;
      } else if (modifiersKey.includes("warning")) {
        backgroundColor = WARNING;
      } else if (modifiersKey.includes("info")) {
        backgroundColor = INFO;
      } else {
        backgroundColor = ERROR;
      }

      const targetTemplate = isDot
        ? `<div style="position:absolute;top:-5px;right:-5px;height:10px;width:10px;border-radius:50%;background:${backgroundColor}"></div>`
        : `<div style="background:${backgroundColor};position:absolute;top:-${HEIGHT /
            2}px;right:-${HEIGHT /
            2}px;height:${HEIGHT}px;min-width:${HEIGHT}px;border-radius:${HEIGHT /
            2}px;text-align:center;line-height:${HEIGHT}px;color:#fff;padding:0 5px;">${value}</div>`;

      el.style.position = el.style.position || "relative";
      const badge = Vue.extend({
        template: targetTemplate
      });
      const component = new badge().$mount().$el;
      if (flag) {
        el.removeChild(el.lastChild);
      }
      el.appendChild(component);
      flag = true;
    }
  },
  //拖拽指令
  //例子:<div v-drag> 支持拖拽的元素 </div>
  /*  */
  drag: {
    inserted: function (el) {
      el.style.cursor = 'move'
      el.onmousedown = function (e) {
        let disx = e.pageX - el.offsetLeft
        let disy = e.pageY - el.offsetTop
        //如果要考虑多事件,这里应该要使用addEventListener
        document.onmousemove = function (e) {
          let x = e.pageX - disx
          let y = e.pageY - disy
          let maxX = document.body.clientWidth - parseInt(window.getComputedStyle(el).width)
          let maxY = document.body.clientHeight - parseInt(window.getComputedStyle(el).height)
          if (x < 0) {
            x = 0
          } else if (x > maxX) {
            x = maxX
          }

          if (y < 0) {
            y = 0
          } else if (y > maxY) {
            y = maxY
          }

          el.style.left = x + 'px'
          el.style.top = y + 'px'
        }
        document.onmouseup = function () {
          //如果要考虑多事件,这里应该要使用removeEventListener
          document.onmousemove = document.onmouseup = null
        }
      }
    },
  },
  //响应缩放指令
  //例子:// 传入 resize() 方法//<div v-resize="resize"></div>
  /* 参数	说明	默认值	类型	可选
  resize()	传入元素改变 size 后执行的方法	/	Function	必选 */
  resize: {
    bind(el, binding) {
      let width = "",
        height = "";
      function isReize() {
        const style = document.defaultView.getComputedStyle(el);
        if (width !== style.width || height !== style.height) {
          binding.value(); // 执行传入的方法
        }
        width = style.width;
        height = style.height;
      }
      el.__timer__ = setInterval(isReize, 300); // 周期性监听元素是否改变
    },
    unbind(el) {
      clearInterval(el.__timer__);
    }
  },
  //字符串整形指令
  //例子:<div v-format.toFixed.price="123333"> 123 </div>
  /* 参数	说明	默认值	类型	可选
  toFixed	保留两位小数	/	String	可选
  price	整形成金额（三位逗号分隔）	/	String	可选 */
  format: {
    update(el, binding, vnode) {
      const { value, modifiers } = binding;
      if (!value) return;
      let formatValue = value;
      if (modifiers.toFixed) {
        formatValue = value.toFixed(2);
      }
      console.log(formatValue);
      if (modifiers.price) {
        formatValue = formatNumber(formatValue);
      }
      el.innerText = formatValue;
      function formatNumber(num) {
        num += "";
        let strs = num.split(".");
        let x1 = strs[0];
        let x2 = strs.length > 1 ? "." + strs[1] : "";
        var rgx = /(\d+)(\d{3})/;
        while (rgx.test(x1)) {
          x1 = x1.replace(rgx, "$1" + "," + "$2");
        }
        return x1 + x2;
      }
    }
  },
  //输入框防抖指令
  //例子:<button v-debounce:500="debounceClick">防抖</button>
  /*  */
  debounce: {
    inserted: function(el, binding) {
      let setTime = binding.arg || 1000;
      let timer;
      el.addEventListener("keyup", () => {
        if (timer) {
          clearTimeout(timer);
        }
        timer = setTimeout(() => {
          binding.value();
        }, setTime);
      });
    }
  },
  //禁止表情及特殊字符
  //例子:
  /*  */
  banEmoji: {
    bind: function(el, binding, vnode) {
      // 正则规则可根据需求自定义
      var regRule = /[^u4E00-u9FA5|d|a-zA-Z|rns,.?!，。？！…—&$=()-+/*{}[]]|s/g;
      let $inp = findEle(el, "input");
      el.$inp = $inp;
      $inp.handle = function() {
        let val = $inp.value;
        $inp.value = val.replace(regRule, "");

        trigger($inp, "input");
      };
      $inp.addEventListener("keyup", $inp.handle);
      function findEle(parent, type) {
        return parent.tagName.toLowerCase() === type
          ? parent
          : parent.querySelector(type);
      }

      function trigger(el, type) {
        const e = document.createEvent("HTMLEvents");
        e.initEvent(type, true, true);
        el.dispatchEvent(e);
      }
    },
    unbind: function(el) {
      el.$inp.removeEventListener("keyup", el.$inp.handle);
    }
  },
  //通过绑定的正则表达式禁止输入
  //例子:
  /*  */
  banInputByRegexp: {
    bind: function(el, binding, vnode) {
      // 正则规则可根据需求自定义
      let regRule = binding.value || "";
      let $inp = findEle(el, "input");
      el.$inp = $inp;
      $inp.handle = function() {
        let val = $inp.value;
        $inp.value = val.replace(regRule, "");

        trigger($inp, "input");
      };
      $inp.addEventListener("keyup", $inp.handle);
      function findEle(parent, type) {
        return parent.tagName.toLowerCase() === type
          ? parent
          : parent.querySelector(type);
      }

      function trigger(el, type) {
        const e = document.createEvent("HTMLEvents");
        e.initEvent(type, true, true);
        el.dispatchEvent(e);
      }
    },
    unbind: function(el) {
      el.$inp.removeEventListener("keyup", el.$inp.handle);
    }
  },
  //页面水印
  //例子:<div v-waterMarker="{text:'lzg版权所有',textColor:'rgba(180, 180, 180, 0.4)'}"></div>
  /*  */
  waterMarker: {
    bind: function (el, binding) {
      addWaterMarker(binding.value.text, el, binding.value.font, binding.value.textColor);
      function addWaterMarker(str, parentNode, font, textColor) {
        // 水印文字，父元素，字体，文字颜色
        var can = document.createElement('canvas')
        parentNode.appendChild(can)
        can.width = 200
        can.height = 150
        can.style.display = 'none'
        var cans = can.getContext('2d')
        cans.rotate((-20 * Math.PI) / 180)
        cans.font = font || '16px Microsoft JhengHei'
        cans.fillStyle = textColor || 'rgba(180, 180, 180, 0.3)'
        cans.textAlign = 'left'
        cans.textBaseline = 'Middle'
        cans.fillText(str, can.width / 10, can.height / 2)
        parentNode.style.backgroundImage = 'url(' + can.toDataURL('image/png') + ')'
      }
    },
  },
  //图片懒加载
  //例子:<img v-lazyLoad="xxx.jpg" />
  /*  */
  lazyLoad: {
    // install方法
    install(Vue, options) {
      const defaultSrc = options.default;
      Vue.directive("lazy", {
        bind(el, binding) {
          lazyLoad.init(el, binding.value, defaultSrc);
        },
        inserted(el) {
          if (IntersectionObserver) {
            lazyLoad.observe(el);
          } else {
            lazyLoad.listenerScroll(el);
          }
        }
      });
    },
    // 初始化
    init(el, val, def) {
      el.setAttribute("data-src", val);
      el.setAttribute("src", def);
    },
    // 利用IntersectionObserver监听el
    observe(el) {
      var io = new IntersectionObserver(entries => {
        const realSrc = el.dataset.src;
        if (entries[0].isIntersecting) {
          if (realSrc) {
            el.src = realSrc;
            el.removeAttribute("data-src");
          }
        }
      });
      io.observe(el);
    },
    // 监听scroll事件
    listenerScroll(el) {
      const handler = lazyLoad.throttle(lazyLoad.load, 300);
      lazyLoad.load(el);
      window.addEventListener("scroll", () => {
        handler(el);
      });
    },
    // 加载真实图片
    load(el) {
      const windowHeight = document.documentElement.clientHeight;
      const elTop = el.getBoundingClientRect().top;
      const elBtm = el.getBoundingClientRect().bottom;
      const realSrc = el.dataset.src;
      if (elTop - windowHeight < 0 && elBtm > 0) {
        if (realSrc) {
          el.src = realSrc;
          el.removeAttribute("data-src");
        }
      }
    },
    // 节流
    throttle(fn, delay) {
      let timer;
      let prevTime;
      return function(...args) {
        const currTime = Date.now();
        const context = this;
        if (!prevTime) prevTime = currTime;
        clearTimeout(timer);

        if (currTime - prevTime > delay) {
          prevTime = currTime;
          fn.apply(context, args);
          clearTimeout(timer);
          return;
        }

        timer = setTimeout(function() {
          prevTime = Date.now();
          timer = null;
          fn.apply(context, args);
        }, delay);
      };
    }
  },
  //点击埋点指令,通常用于某块点击操作时需要上传数据到服务器
  //例子:<div v-track:xxx="{other:'xxx'}"></div>
  /* 上传数据点结构{   
      eventName: 'xxx'
      userInfo:{},
      data: {//额外自定义数据
          other: 'xxx'
      }
  } */
  userTrack: {
    inserted (el, binding) {
      el.addEventListener('click', () => {
        if (!binding.arg) {
          console.error('Track 事件名无效')
          return
        }
        // 自定义数据
        let extraTrackData = binding.value || {}

        util.userTrackSave(binding.arg,extraTrackData);
      })
    }
  },
  // //
  // //例子:
  // /*  */
  // xxx: {
  //   bind: function(el, binding) {}
  // },
};

export default vueDirectiveCustom;
