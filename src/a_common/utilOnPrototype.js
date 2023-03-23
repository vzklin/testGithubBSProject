//时间格式化
Date.prototype.Format = function(fmt) {
  var o = {
    "M+": this.getMonth() + 1, //月份
    "d+": this.getDate(), //日
    "h+": this.getHours(), //小时
    "H+": this.getHours(), //小时
    "m+": this.getMinutes(), //分
    "s+": this.getSeconds(), //秒
    "q+": Math.floor((this.getMonth() + 3) / 3), //季度
    S: this.getMilliseconds() //毫秒
  };
  if (/(y+)/.test(fmt))
    fmt = fmt.replace(
      RegExp.$1,
      (this.getFullYear() + "").substr(4 - RegExp.$1.length)
    );
  for (var k in o)
    if (new RegExp("(" + k + ")").test(fmt))
      fmt = fmt.replace(
        RegExp.$1,
        RegExp.$1.length == 1 ? o[k] : ("00" + o[k]).substr(("" + o[k]).length)
      );
  return fmt;
};

//日期转换函数,字符串使用,语法糖
String.prototype.toFormatDate = function(formatType,{toNumber=false}={}) {
  let a;
  try{
      a = new Date(this)
  }catch(error){
      console.error(`字符串转换日期报错`,this,error)
      return this;
  }
  let out = a.Format(formatType);
  out = toNumber?Number(out):out;
  return out;
};
//日期转换函数,数字使用,语法糖
Number.prototype.toFormatDate = function(formatType,{toNumber=false}={}) {
  try{
      let a = new Date(this)
  }catch(error){
      console.error(`字符串转换日期报错`,this,error)
      return this;
  }
  let out = a.Format(formatType);
  out = toNumber?Number(out):out;
  return out;
};


//判断是否图片
String.prototype.IsPicture = function() {
  //判断是否是图片 - strFilter必须是小写列举
  var strFilter = ".jpeg|.gif|.jpg|.png|.bmp|.pic|";
  console.warn("ispppdasda");
  if (this.indexOf(".") > -1) {
    var p = this.lastIndexOf(".");
    //alert(p);
    //alert(this.length);
    var strPostfix = this.substring(p, this.length) + "|";
    strPostfix = strPostfix.toLowerCase();
    //alert(strPostfix);
    if (strFilter.indexOf(strPostfix) > -1) {
      //alert("True");
      return true;
    }
  }
  //alert('False');
  return false;
};

//toFixed字符串版本，可对字符串类型数字操作
String.prototype.toFixed = function(num,{showConsole=true}={}) {
  let a = Number(this);
  if(Number.isNaN(a)){
    // if(showConsole){console.warn(`“${this}”不可转换为数字`);}
    return this;
  }
  else{
    let numFix = a.toFixed(num);
    //其他操作
    return numFix;
  }
};
String.prototype.toFixedNum = function(num,{showConsole=true}={}) {
  let a = Number(this);
  if(Number.isNaN(a)){
    // if(showConsole){console.warn(`“${this}”不可转换为数字`);}
    return this;
  }
  else{
    let numFix = Number(a.toFixed(num));
    //其他操作
    return numFix;
  }
};
//toFixedInFront字符串版本，添加前导零，给数字补位0
String.prototype.toFixedInFront = function(cover,{showConsole=true}={}) {
  let a = Number(this);
  if(Number.isNaN(a)){
    // if(showConsole){console.warn(`“${this}”不可转换为数字`);}
    return this;
  }
  else{
    //其他操作
    return String("0".repeat(cover) + a).slice(-cover);
  }
};
//检查电话号码是否符合格式
String.prototype.checkIsPhone = function(){
  if (/^1[3456789]\d{9}$/.test(this)) {
    return true;
  } else {
    Message.warning("电话号码不合法");
    return false;
  }
};
//重要console显示，开发用，warn可查看调用路径
String.prototype.importantWarn = function(){
  console.warn("---------提示分隔线-----------\n\n\n");
  console.warn(this);
  console.warn("\n\n\n----------提示分隔线----------");
};
//trim方法的前端实现（去除字符串头尾空格）
String.prototype.trim = function() {
  return this.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
}

//toFixed直接转换百分比字符串,字符串使用,语法糖
String.prototype.toFixedPercent = function(num,{showConsole=true}={}) {
  let a = Number(this);
  if(Number.isNaN(a)){
    // if(showConsole){console.warn(`“${this}”不可转换为数字`);}
    return this;
  }
  else{
    let numFix = (a*100).toFixed(num)+ "%";
    //其他操作
    return numFix;
  }
};
//toFixed直接转换百分比字符串,数字使用,语法糖
Number.prototype.toFixedPercent = function(num,{showConsole=true}={}) {
  let a = this;
  if(Number.isNaN(a)){
    // if(showConsole){console.warn(`“${this}”不可转换为数字`);}
    return this;
  }
  else{
    let numFix = (a*100).toFixed(num)+ "%";
    //其他操作
    return numFix;
  }
};
//toFixed直接转换百分比,字符串使用,语法糖
String.prototype.toFixedPercentNoSymbol = function(num,{showConsole=true}={}) {
  let a = Number(this);
  if(Number.isNaN(a)){
    // if(showConsole){console.warn(`“${this}”不可转换为数字`);}
    return this;
  }
  else{
    let numFix = Number((a*100).toFixed(num));
    //其他操作
    return numFix;
  }
};
//toFixed直接转换百分比,数字使用,语法糖
Number.prototype.toFixedPercentNoSymbol = function(num,{showConsole=true}={}) {
  let a = this;
  if(Number.isNaN(a)){
    // if(showConsole){console.warn(`“${this}”不可转换为数字`);}
    return this;
  }
  else{
    let numFix = Number((a*100).toFixed(num));
    //其他操作
    return numFix;
  }
};
//toFixed优化版，不同浏览器toFixed不一定四舍五入,用这个方法可统一四舍五入
Number.prototype.toFixedCustom=function(len) {
  var add = 0;
  var s,temp;
  var s1 = this + "";
  var start = s1.indexOf(".");
  if(s1.substr(start+len+1,1)>=5)add=1;
  var temp = Math.pow(10,len);
  s = Math.floor(this * temp) + add;
  return s/temp;
};
//toFixed优化版，可直接输出数字//使用toFixedNum(10)来得到精度不缺失的计算数字
Number.prototype.toFixedNum = function(num) {
  let numFix = Number(this.toFixed(num));
  //其他操作
  return numFix;
};
//toFixed优化版，输出不带尾数0的字符串版本
Number.prototype.toFixedNo0 = function(num) {
  let numFix = this.toFixed(num).replace(/[.]?0+$/,"");
  //其他操作
  return numFix;
};
//toFixed特别版本，供效益评估表后续可能的改动使用
Number.prototype.toFixedSp = function(num) {
  // let numFix = this.toFixed(num);
  //新增不处理，显示直接在页面标签上进行转换
  //其他操作
  return this;
};
//toFixedInFront:添加前导零，给数字补位0
Number.prototype.toFixedInFront = function(cover) {
  return String("0".repeat(cover) + this).slice(-cover);
};
//阿拉伯数字转中文数字
Number.prototype.numToChinese = function() {
  if (!/^\d*(\.\d*)?$/.test(this)) {
    alert("Number is wrong!");
    return "Number is wrong!";
  }
  var AA = new Array(
    "零",
    "一",
    "二",
    "三",
    "四",
    "五",
    "六",
    "七",
    "八",
    "九"
  );
  var BB = new Array("", "十", "百", "千", "万", "亿", "点", "");
  var a = ("" + this).replace(/(^0*)/g, "").split("."),
    k = 0,
    re = "";
  for (var i = a[0].length - 1; i >= 0; i--) {
    switch (k) {
      case 0:
        re = BB[7] + re;
        break;
      case 4:
        if (!new RegExp("0{4}\\d{" + (a[0].length - i - 1) + "}$").test(a[0]))
          re = BB[4] + re;
        break;
      case 8:
        re = BB[5] + re;
        BB[7] = BB[5];
        k = 0;
        break;
    }
    if (k % 4 == 2 && a[0].charAt(i + 2) != 0 && a[0].charAt(i + 1) == 0)
      re = AA[0] + re;
    if (a[0].charAt(i) != 0) re = AA[a[0].charAt(i)] + BB[k % 4] + re;
    k++;
  }
  if (a.length > 1) {
    //加上小数部分(如果有小数部分)
    re += BB[6];
    for (var i = 0; i < a[1].length; i++) re += AA[a[1].charAt(i)];
  }
  return re;
};

//不能扩展Array和Object原型链的原因,因为这项目有人用for in去循环数组

//判断数组是否相等//一般是需要内容判断相等时用//否则可以使用util中的deepEqual
// Array.prototype.equals_proto = function(arr2,{
//   justContent = true,
// }={}) {
//   if(!Array.isArray(arr2))return console.warn(`请传入数组`);
//   if(justContent){
//     return JSON.stringify(this.sort()) === JSON.stringify(arr2.sort());
//   }
//   else{
//     return JSON.stringify(this) === JSON.stringify(arr2);
//   }
// };
// //根据数组某个值进行再分组
// Array.prototype.sortClass = function(prop){
//   const groupBy = (array, f) => {
//     let groups = {};
//     array.forEach((o) => {
//       let group = JSON.stringify(f(o));
//       groups[group] = groups[group] || [];
//       groups[group].push(o);
//     });
//     return Object.keys(groups).map((group) => {
//       return groups[group];
//     });
//   };
//   const sorted = groupBy(this, (item) => {
//     return prop?item[prop]:item; // 返回需要分组的对象
//   });
//   return sorted;
// };

// //loop原型链方法,Array原型也属于Object
// Array.prototype.loop_proto = function(fn, { reverse = false, array_method = "" } = {}){
//   if(!(fn instanceof Function))return;
//   if(!this)return console.warn(`循环对象不存在`);
//   try {
//     if (this.length >= 0) {
//       if (reverse) {//反向循环
//         for (let i = this.length - 1; i >= 0; i--) {
//           let isBreak = fn(this[i], i);
//           if (isBreak == "break") {
//             break;
//           } else if (isBreak == "continue") {
//             continue;
//           }
//         }
//       } else {
//         for (let i = 0;i < this.length; i++) {
//           let isBreak = fn(this[i], i);
//           if (isBreak == "break") {
//             break;
//           } else if (isBreak == "continue") {
//             continue;
//           }
//         }
//       }
//     }
//   } catch (error) {
//     console.error("loop_proto报错", error);
//   }
// };

//不要在Object.prototype上定义方法，会有严重的问题
let utilOnPrototype = {};
export default utilOnPrototype;
