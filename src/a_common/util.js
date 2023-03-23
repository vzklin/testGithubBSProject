import Vue from "vue";
import axios from 'axios'
import store from "@/store";
import router from "@/router";
import { Message, Loading, MessageBox, Notification} from "element-ui";
import { Toast,Notify,Dialog } from 'vant';
import request from "@/utils/request";
import global from "@/a_common/globalFunc";
import utilOnPrototype from "./utilOnPrototype.js";//执行原型链扩展注册
import AsyncValidator from "async-validator";
import rulesFunc from "@/a_common/rulesFunc";
//08-09,自定义指令注册
import vueDirectiveCustom from "./vueDirectiveCustom.js";
import { makeAuthorization } from "@/utils/auth";
//注册所有自定义指令
for (let name in vueDirectiveCustom) {
  Vue.directive(name, vueDirectiveCustom[name]);
}

const utilParam = {
  loadingCount: 0,
  spFlowCheckTip_devNotify: null,
}; //用于本文件公用函数中重复读取判定等逻辑需要的参数存放
let isDevelopment = process.env.NODE_ENV === "development";
let isDev = process.env.NODE_ENV === "development";

//通用的http请求用API
const apiHttp = ({
  url = "",
  param = {},
  failCallBack = () => {},
  completeCallBack = () => {},
  codeErrorFailCallBack = false,//code不为指定code时走失败回调
  failToast = true,
  failDontThrowError = true,//后端没有对应的处理,暂时不需要
  that = null,
  showLoading = false,
  showLoadingByProp = null,
  loadingWord = "请稍候",
  loadingMask = true,
  needToken = true,
  method = "POST",
  postUseQuery = false,
  repeatCheck = false,
  repeatCheckTime = null,
  storageTime = null,
  responseType = "",
  showConsoleWord = "",
  nullToEmptyString = false,
  setTestData = null, //测试环境用模拟后端接口返回数据,延迟0.3秒
  useTempBaseURL = null,
} = {}) => {
  if (setTestData && isDevelopment) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        showToast(`模拟返回数据,url:${url}`);
        console.log("url:",url,"使用测试数据返回,参数:",param,"返回的测试数据:",setTestData);
        resolve(setTestData);
      }, 300);
    });
  }
  try {
    return new Promise((resolve, reject) => {
      //重复读取判定
      // let temp_arr = url.split("/");
      // let urlName = temp_arr[temp_arr.length - 1];
      if (!url) {
        isDevelopment && showToast(`url不存在`, { type: "error" });
      }
      let urlName = url;
      let repeatCheckName = "onPost" + urlName;
      let loadingMaskName = "onLoading" + urlName;

      if (repeatCheck) {
        // console.warn("utilParam", utilParam,repeatCheckName);
        console.log(
          "判断接口是否在调用中",
          repeatCheckName,
          utilParam[repeatCheckName]
        );
        if (utilParam[repeatCheckName]) {
          console.warn("接口调用中，取消该次调用", repeatCheckName);
          return;
        }
        utilParam[repeatCheckName] = true;
      }
      //重复读取判定
      //数据存储时间设定判定
      if (storageTime) {
        let storageData = getStorageWithTime({
          key: "storage" + urlName,
          expireTime: storageTime
        });
        if (storageData) {
          resolve(storageData);
          completeCallBack();
          return;
        }
      }
      //数据存储时间设定判定
      if (showLoadingByProp !== null && that) {
        that.$set(that, showLoadingByProp, true);
      } else if (showLoading) {
        // var loading = Loading.service({
        //   lock: loadingMask,
        //   text: loadingWord,
        //   spinner: "el-icon-loading",
        //   background: "rgba(0, 0, 0, 0.7)",
        //   fullscreen: loadingMask
        // });
        // ++utilParam.loadingCount;
        utilParam[loadingMaskName] = true;
        var loading = showLoadingCopy({
          mask: loadingMask,
          title: loadingWord,
          duration: 300000,
          afterDisappear: () => {
            if (utilParam[loadingMaskName]) {
              isDevelopment &&
                showToast(`请求遮罩超过300秒,自动关闭`, { duration: 10000 });
            }
          }
        });
      } else if (showLoadingByProp !== null && !that) {
        showToast(`使用showLoadingByProp需要传页面this`, { type: "error" });
      }

      // 请求url根据需要进行拼接
      let post_url;
      post_url = url;

      let axios_param = {
        url: post_url,
        method: method
        // data: param,//POST用
        // params: param,//get用
      };
      if (responseType) {
        axios_param.responseType = responseType;
      }
      switch (method) {
        case "POST":
          axios_param.data = param;
          if (postUseQuery) {
            axios_param.params = param;
          }
          break;
        case "GET":
          axios_param.params = param;
          break;
        default:
          axios_param.data = param;
          break;
      }
      let firstLvReq = request;
      if(useTempBaseURL){//如果url前缀不同会有跨域问题,需要在vue.config.js中配置跨域相关
        firstLvReq = axios.create( {
          baseURL:useTempBaseURL,//"http://192.168.5.236:9999/prod-api/",
          timeout:10 * 60 * 1000, // request timeout
        });
        firstLvReq.interceptors.response.use(
          //简单模拟实际axios的处理
          response =>  {
            const data = response.data;
            return data;
          },
          error => {
            return Promise.reject(error);
          }
        );
      }
      
      firstLvReq(axios_param)
        .then(res => {
          // resolve(res.data.data);
          if (showConsoleWord) {
            console.log(showConsoleWord,copy2(res));
          }
          if (res.code && res.code != 200 && res.code != "0000") {
            let msg = res.msg
              ? res.msg
              : res.message
              ? res.message
              : "接口异常";
            if(failToast){
              showToast(msg, { type: "error" });
            }
            if(!failDontThrowError){
              throw new Error("接口异常");
            }
            if(codeErrorFailCallBack){
              failCallBack(res);
              reject && reject(res);
            }
          }
          if (nullToEmptyString) {
            loopDeep(res, (item, index, propBelongObj) => {
              if (item === null) {
                propBelongObj[index] = "";
                console.warn("null值，转换为''", index);
              }
            });
          }
          resolve(res);
          if (storageTime) {
            setStorageWithTime({
              key: "storage" + urlName,
              // value: res.data.data
              value: res
            });
          }
          if (repeatCheck) {
            if (repeatCheckTime) {
              setTimeout(function() {
                utilParam[repeatCheckName] = false;
              }, repeatCheckTime);
            } else {
              utilParam[repeatCheckName] = false;
            }
          }
        })
        .catch(res => {
          if (repeatCheck) {
            utilParam[repeatCheckName] = false;
          }
          consoleError(`统一接口报错，报错url:${url},详细信息:`,res);
          if(isDev && res.response?.status && res.response.status !== 200){
            showToast(`http_code:${res.response.status},msg:${res.response.data.message}`,{type:"error",duration:6000});
          }
          failCallBack(res);
          reject && reject(res);
        })
        .finally(res => {
          if (showLoadingByProp !== null && that) {
            that.$set(that, showLoadingByProp, false);
            //that[showLoadingByProp] = false;//在IE列表数据量大的情况下似乎会导致loading一直存在
          } else if (showLoading) {
            showLoadingClose(loading);
            utilParam[loadingMaskName] = false;
          }
          completeCallBack(res);
        });
      // if (method == "POST") {

      // } else if (method == "GET") {
      //   console.warn("GET之后再写");
      // }
    });
  } catch (error) {
    console.warn("apiHttp调用报错", error);
  }
};

//报错收集
const collectError = (urlName, param, errReturnObj) => {
  if (isDevelopment) {
    return;
  }
  if (urlName === "common/wechatWebErrLog") {
    return;
  }
  let msg = "报错接口名：" + urlName + "\n";
  msg += "参数：" + JSON.stringify(param) + "\n";
  msg += "返回报错信息：" + JSON.stringify(errReturnObj) + "\n";
  msg += "用户登录凭证：" + "JSESSIONID=" + store.state.sessionId;
  let obj = {
    errMsg: msg
  };
  apiHttp({
    url: "common/wechatWebErrLog",
    param: obj
  }).then(() => {});
};

//页面跳转优化版//集合获取路由函数工具getRouterParams来使用,自动设置和获取基本数据类型参数和扩展数据类型参数
const routerPushPro = ({
  that = null,
  name = "",
  path = "",
  paramsAndQuery = {},
  useSessionStorageSaveRouteParamsKey = "",
  openNewWindow = false,
} = {}) => {
  if (!that) {
    return showToast(`需要传this`, { type: "error" });
  }
  let routerOptions2 = {};
  if (name) {
    routerOptions2.name = name;
  } else {
    routerOptions2.path = path;
  }
  //拆分参数,基本数据类型放在query,扩展数据类型放在params中
  loop(paramsAndQuery, (item, index) => {
    if (typeof paramsAndQuery[index] === "object") {
      if (!routerOptions2.params) routerOptions2.params = {};
      routerOptions2.params[index] = paramsAndQuery[index];
    } else {
      if (!routerOptions2.query) routerOptions2.query = {};
      routerOptions2.query[index] = paramsAndQuery[index];
    }
  });

  if (useSessionStorageSaveRouteParamsKey) {
    let sessionStorage_key =
      useSessionStorageSaveRouteParamsKey +
      "_useSessionStorageSaveRouteParamsKey";
    sessionStorage.setItem(sessionStorage_key, JSON.stringify(routerOptions2));
  }
  
  if(openNewWindow){
    let strJoin = "";
    loop(routerOptions2.query,(item,index)=>{
      if(item){
        strJoin += index + "=" + item + "&";
      }
    });
    window.open(window.location.href.split("#")[0] + "#/login?redirect=" + path + (strJoin?"?"+strJoin:""));
  }
  else{
    that.$router.push(routerOptions2);
  }
  
};
const getRouterParams = ({
  that = null,
  useSessionStorageSaveRouteParamsKey = ""
} = {}) => {
  if (!that) {
    return showToast(`需要传this`, { type: "error" });
  }
  //获取自动拆分的参数,基本数据类型放在query,扩展数据类型放在params中
  let params;
  if (
    useSessionStorageSaveRouteParamsKey &&
    isObjectEmpty(that.$route.params)
  ) {
    let parse = JSON.parse(
      sessionStorage.getItem(
        useSessionStorageSaveRouteParamsKey +
          "_useSessionStorageSaveRouteParamsKey"
      )
    );
    params = {
      ...that.$route.query
    };
    if (parse) {
      params = {
        ...params,
        ...parse.params
      };
    }
  } else {
    params = {
      ...that.$route.query,
      ...that.$route.params
    };
  }
  console.log(`获取到的路由参数为`,copy2(params));
  return params;
};

//页面跳转旧版
const routerPush = (
  urlName,
  {
    params = {},
    loginCheck = false,
    authCheck = false,
    paramsProp = "query",
    byUrl = false
  } = {}
) => {
  let options = {};
  if (byUrl) {
    options.path = urlName;
  } else {
    options.name = urlName;
  }
  //...后续操作追加
  if (paramsProp == "query") {
    options.query = params;
  } else {
    options.params = params;
  }
  router.push(options);
};

//将对象毫秒或date对象属性转换为带指定格式的时间集合，
const addTimeObjOrTimeDesc = (
  obj,
  time,
  {
    setTimeObj = false,
    propTimeName = "timeFormatObj",
    propTimeDescName = "timeDesc",
    setTimeDesc = false,
    timeDescType = "hour",
    ifTimeEmptyReturnEmpty = true
  } = {}
) => {
  if (obj[propTimeName]) {
    console.warn("已有timeFormatObj");
    return;
  }
  if (!time && ifTimeEmptyReturnEmpty) {
    obj[propTimeName] = {
      year: "",
      month: "",
      day: "",
      hour: "",
      minute: "",
      second: "",
      ymdhms: "",
      ymdhm: "",
      ymd: "",
      md: "",
      mdhm: "",
      hms: "",
      hm: "",
      ms: ""
    };
    obj[propTimeDescName] = "";
  } else {
    if (!time) {
      time = new Date().setHours(0, 0, 0);
    }
    if (setTimeObj) {
      let dt = new Date(time);
      const year = dt.getFullYear();
      const month = formatNumber(dt.getMonth() + 1);
      const day = formatNumber(dt.getDate());
      const hour = formatNumber(dt.getHours());
      const minute = formatNumber(dt.getMinutes());
      const second = formatNumber(dt.getSeconds());
      obj[propTimeName] = {
        year: year,
        month: month,
        day: day,
        hour: hour,
        minute: minute,
        second: second,
        ymdhms: `${year}-${month}-${day} ${hour}:${minute}:${second}`,
        ymdhm: `${year}-${month}-${day} ${hour}:${minute}`,
        ymd: `${year}-${month}-${day}`,
        md: `${month}-${day}`,
        mdhm: `${month}-${day} ${hour}:${minute}`,
        hms: `${hour}:${minute}:${second}`,
        hm: `${hour}:${minute}`,
        ms: `${minute}:${second}`
      };
    }
    if (setTimeDesc) {
      obj[propTimeDescName] = `${year}-${month}-${day}`;
      let monthLater = Math.ceil(
        (new Date().getTime() - time) / 1000 / 60 / 60 / 24 / 30
      );
      let dayLater = Math.ceil(
        (new Date().getTime() - time) / 1000 / 60 / 60 / 24
      );
      let hourLater = Math.ceil((new Date().getTime() - time) / 1000 / 60 / 60);
      let minuteLater = Math.ceil((new Date().getTime() - time) / 1000 / 60);
      switch (timeDescType) {
        case "month":
          if (minuteLater < 60) {
            obj[propTimeDescName] = `${minuteLater}分钟前`;
          } else if (hourLater < 24) {
            obj[propTimeDescName] = `${hourLater}小时前`;
          } else if (dayLater < 30) {
            obj[propTimeDescName] = `${dayLater}天前`;
          } else if (monthLater < 12) {
            obj[propTimeDescName] = `${monthLater}个月前`;
          }
          break;
        case "day":
          if (minuteLater < 60) {
            obj[propTimeDescName] = `${minuteLater}分钟前`;
          } else if (hourLater < 24) {
            obj[propTimeDescName] = `${hourLater}小时前`;
          } else if (dayLater < 30) {
            obj[propTimeDescName] = `${dayLater}天前`;
          }
          break;
        case "hour":
          if (minuteLater < 60) {
            obj[propTimeDescName] = `${minuteLater}分钟前`;
          } else if (hourLater < 24) {
            obj[propTimeDescName] = `${hourLater}小时前`;
          }
          break;
        case "min":
          if (minuteLater < 60) {
            obj[propTimeDescName] = `${minuteLater}分钟前`;
          }
          break;
      }
    }
  }
};

//将秒数转换为天-时-分钟
const getSecToFormat = sec => {
  if (!sec) {
    return "";
  }
  let day = Math.floor(sec / 24 / 60 / 60);
  let hour = Math.floor(sec / 60 / 60);
  let minute = Math.floor(sec / 60);
  let format;
  if (sec < 60) {
    format = sec + "秒";
  } else if (minute < 60) {
    sec = sec - minute * 60;
    format = minute + "分钟" + sec + "秒";
  } else if (hour < 24) {
    minute = minute - hour * 60;
    sec = sec - minute * 60 - hour * 60 * 60;
    format = hour + "小时" + minute + "分钟" + sec + "秒";
  } else {
    hour = hour - day * 24;
    minute = minute - hour * 60 - day * 24 * 60;
    format = day + "天" + hour + "小时" + minute + "分钟";
  }
  return format;
};

//获取当前时间的字符串格式//没什么意义，直接使用new Date().Format("yyyy-MM-dd HH:mm:ss")实现即可
const getPresentTime = () => {
  let _this = this;
  let yy = new Date().getFullYear();
  let mm =
    new Date().getMonth() + 1 < 10
      ? "0" + (new Date().getMonth() + 1)
      : new Date().getMonth() + 1;
  let dd =
    new Date().getDate() < 10
      ? "0" + new Date().getDate()
      : new Date().getDate();
  let hh =
    new Date().getHours() < 10
      ? "0" + new Date().getHours()
      : new Date().getHours();
  let mf =
    new Date().getMinutes() < 10
      ? "0" + new Date().getMinutes()
      : new Date().getMinutes();
  let ss =
    new Date().getSeconds() < 10
      ? "0" + new Date().getSeconds()
      : new Date().getSeconds();
  var gettime = yy + "-" + mm + "-" + dd + " " + hh + ":" + mf + ":" + ss;
  return gettime;
};

//用于个位数数字转换带0的
const formatNumber = n => {
  n = n.toString();
  return n[1] ? n : "0" + n;
};

//获取指定名称
const getFormName = formid => {
  return (
    {
      1: "名称1",
      2: "名称2",
      3: "名称3",
      4: "名称4"
    }[formid] || ""
  );
};

/**
 * 限制上传的图片类型及大小
 * @param {*} file
 */
const beforeImgUpload = file => {
  const isJPGPng =
    file.type === "image/jpeg" ||
    file.type === "image/png" ||
    file.type === "image/bmp";
  const isLt = file.size / 1024 / 1024 < 1;

  if (!isJPGPng) {
    Message.warning("上传图片只能是 JPG/PNG/BMP 格式!");
  }
  if (!isLt) {
    Message.warning("上传图片大小不能超过 1MB!");
  }
  return isJPGPng && isLt;
};

/**
 * 限制上传的文件类型及大小
 */
const beforeFileUpload = file => {
  const isLt = file.size / 1024 / 1024 < 30;
  const isType = /\.(doc|docx|xlsx|xls|ppt|pptx|jpg|png|bmp|rar|zip|pdf)$/i.test(
    file.name
  );

  if (!isType) {
    Message.warning(`上传的只能是 图片/word/Excel/pdf/PPT/压缩包!`);
  }
  if (!isLt) {
    Message.warning("上传文件大小不能超过 30MB!");
  }
  return isType && isLt;
};

//检查是否支持flash
const checkFlash = () => {
  if (window.ActiveXObject) {
    try {
      let swf = new ActiveXObject("ShockwaveFlash.ShockwaveFlash");
      if (swf) {
        return true;
      }
    } catch (e) {}
  } else {
    try {
      let swf = navigator.plugins["Shockwave Flash"];
      if (swf) {
        return true;
      }
    } catch (e) {}
  }
  return false;
};

//获取浏览器url?后的参数
const getUrlParams = () => {
  let obj = {};
  let str = window.location.href;
  let arr = str.substr(str.indexOf("?") + 1).split("&");
  for (let i = 0; i < arr.length; i++) {
    if (arr[i].indexOf("=") > -1) {
      obj[arr[i].substring(0, arr[i].indexOf("="))] = arr[i].substr(
        arr[i].indexOf("=") + 1
      );
    }
  }
  console.warn(obj);
  return obj;
};

//获取浏览器url?后的参数//url需要转码的情况
const getUrlParamTwo = () => {
  let obj = {};
  let str = window.location.href;
  let arr = str.substr(str.indexOf("?") + 1).split("&");
  for (let i = 0; i < arr.length; i++) {
    if (arr[i].indexOf("=") > -1) {
      obj[arr[i].substring(0, arr[i].indexOf("="))] = decodeURIComponent(
        decodeURIComponent(arr[i].substr(arr[i].indexOf("=") + 1))
      );
    }
  }
  console.warn(obj);
  return obj;
};

//asc升序,desc降序
//返回一个排序用的函数，用法:array.sort(this.$util.sortBy('age'));
//通常与array的sort方法配合使用，指定数组某个属性对该数组进行排序
const sortBy = function(name = "", order = "asc") {
  return function(o, p) {
    var a, b;
    if (typeof o === "object" && typeof p === "object" && o && p && name) {
      a = o[name];
      b = p[name];
      if (a === b) {
        return 0;
      }
      if (typeof a === typeof b) {
        if (order === "desc") {
          return a > b ? -1 : 1;
        }
        return a < b ? -1 : 1;
      }
      if (order === "desc") {
        return typeof a > typeof b ? -1 : 1;
      }
      return typeof a < typeof b ? -1 : 1;
    } else if (o !== undefined && p !== undefined) {
      //增加基础数据类型的sort
      a = o;
      b = p;
      if (a === b) {
        return 0;
      }
      if (typeof a === typeof b) {
        if (order === "desc") {
          return a > b ? -1 : 1;
        }
        return a < b ? -1 : 1;
      }
      if (order === "desc") {
        return typeof a > typeof b ? -1 : 1;
      }
      return typeof a < typeof b ? -1 : 1;
    } else {
      throw "error";
    }
  };
};

//该函数直接改变原数组
//asc升序,desc降序
//简单的升序或排序函数,改变原数组
//通常与上面的sortBy方法配合使用，指定数组某个属性对该数组进行排序
const sortArr = function({ arr = [], order = "asc", sortByProp = "" }) {
  if (sortByProp) {
    //一维对象数组排序
    arr.sort(sortBy(sortByProp, order));
  } else {
    //一维简单数组排序
    arr.sort(sortBy("", order));
  }
};

// 循环用函数(多使用find,findIndex,filter,indexOf,reduce等array自带方法简化代码)
//通用循环函数，可用于数组，对象，可中断，参数可扩展
const loop = (
  obj,
  fn,
  { reverse = false, array_method = "", loopStr = true } = {}
) => {
  if (!obj) return console.warn(`循环对象值为空或者undefined,值为`,obj);
  try {
    if (array_method && obj instanceof Array) {
      switch (array_method) {
        case "filter":
          return obj.filter(fn);
          // obj = obj.filter(fn);//loop方法无法直接在这里修改原对象
          break;
        case "find":
          return obj.find(fn);
        default:
          break;
      }
    } else {
      if (reverse) {
        let i = obj.length - 1; //将计算式提取到外部,优化性能
        for (i; i >= 0; i--) {
          let isBreak = fn(obj[i], i);

          if (isBreak == "break") {
            break;
          } else if (isBreak == "continue") {
            continue;
          }
        }

        //改为
      } else {
        if (typeof obj == "string" && loopStr) {
          console.warn("循环对象是字符串,尝试使用spilt(',')分割");
          try {
            let arrStr = obj.split(",");
            for (let [index, item] of arrStr.entries()) {
              let isBreak = fn(item, index);
              if (isBreak == "break") {
                break;
              } else if (isBreak == "continue") {
                continue;
              }
            }
          } catch (error) {
            consoleError(`循环对象是字符串时报错`, error);
          }
        } else if (
          (Array.isArray(obj) && obj.length >= 0) ||
          obj[Symbol.iterator]
        ) {
          for (let [index, item] of obj.entries()) {
            //
            let isBreak = fn(item, index);
            if (isBreak == "break") {
              break;
            } else if (isBreak == "continue") {
              continue;
            }
          }
        } else if (typeof obj == "object" && !isObjectEmpty(obj)) {
          //缺点：在循环中通过item变量修改子项时，无法改变原对象,
          //需要通过在循环中调用obj[attr]的方式才能修改,原因暂时未知
          //注意，数组也是对象
          // for (let [index, attr] of Object.keys(obj).entries()) {
          for (let attr in obj) {
            if (obj.hasOwnProperty(attr)) {
              let isBreak = fn(obj[attr], attr);

              if (isBreak == "break") {
                break;
              } else if (isBreak == "continue") {
                continue;
              }
            }
          }
        }
        else if(isObjectEmpty(obj)){
          // console.warn("Array.isArray(obj)为", Array.isArray(obj));
          console.log("循环对象为空对象");
        }
        else {
          // console.warn("Array.isArray(obj)为", Array.isArray(obj));
          console.warn("该对象无法被循环遍历，对象为", obj,"请查看相关代码并修改");
          console.warn("对象type为", typeof obj);
        }
      }
    }
  } catch (error) {
    consoleError("loop报错", error);
  }
};

//深拷贝
const copy = obj => {
  //换一种方法,这方法无法取消监听
  if (!obj) return console.warn(`需要copy的数据不存在,obj`, obj);
  let newobj = obj.constructor === Array ? [] : {};
  if (typeof obj !== "object") {
    return;
  }
  try {
    for (let i in obj) {
      if (obj[i] === null) {
        newobj[i] = null;
      } else {
        newobj[i] = typeof obj[i] === "object" ? copy(obj[i]) : obj[i];
      }
    }
  } catch (error) {
    consoleError(`深复制时出错`, obj, error);
  }
  return newobj;
};

//能删除监听的深复制
const copy2 = obj => {
  if (!obj) {
    console.warn(`需要copy的数据不存在,obj`, obj);
    return obj;
  }
  if (typeof obj !== "object") {
    return obj;
  }
  else{
    let copyObj = JSON.parse(JSON.stringify(obj));
    return copyObj;
  }
  
};

//判断对象是否为空或者未定义
const isObjectEmpty = object => {
  if (!object) {
    return true;
  }
  if (Object.keys(object).length === 0) {
    return true;
  }
  return false;
};

const isObjectEmptyOrUndefined = object => {
  if (!object) {
    return true;
  } else if (Object.keys(object).length === 0) {
    return true;
  }
  return false;
};

//设置时间限制的指定缓存，需要和getStorageWithTime配合使用
const setStorageWithTime = ({ key = "", value = "" } = {}) => {
  value = JSON.stringify(value);
  localStorage.setItem(key, value);
  localStorage.setItem(key + "Time", new Date().getTime());
};

//获取指定时间限制的缓存，需要和setStorageWithTime配合使用
const getStorageWithTime = ({ key = "", expireTime = "" } = {}) => {
  if (!key || !expireTime) {
    Message.warning("storage的key或过期时间不能为空");
    return;
  }
  let dataTime = localStorage.getItem(key + "Time");
  let nowTime = new Date().getTime();
  if (nowTime - dataTime > expireTime) {
    console.warn(key + "数据已过期");
    return null;
  } else {
    return JSON.parse(localStorage.getItem(key));
  }
};

//设置登录用session，暂时用不到
const setSessionId = data => {
  store.state.sessionId = data;
  store.state.upload_url = `${store.state.upload_url}?token=${data}`;
  setStorageWithTime({
    key: "sessionId",
    value: data
  });
};

//获取登录用session，暂时用不到
const getSessionId = () => {
  let sessionId = getStorageWithTime({
    key: "sessionId",
    expireTime: 1000 * 60 * 60 * 12
  });
  if (sessionId) {
    store.state.sessionId = sessionId;
    store.state.upload_url = `${store.state.upload_url}?token=${sessionId}`;
    return sessionId;
  } else {
    return null;
  }
};

//去除登录用session，暂时用不到
const removeSessionId = () => {
  store.state.sessionId = "";
  clearAllCookie();
  removeStorage("sessionId"); // 移除旧session
  removeStorage("sessionIdTime");
};

//清除所有cookie
const clearAllCookie = () => {
  var keys = document.cookie.match(/[^ =;]+(?=\=)/g);
  if (keys) {
    for (var i = keys.length; i--; )
      document.cookie = keys[i] + "=0;expires=" + new Date(0).toUTCString();
  }
};

//重要console显示，开发用，warn可查看调用路径
const importantLog = (str, type) => {
  switch (type) {
    case "log":
      console.log(
        "---------important-log-----------\n\n",
        str,
        "\n\n----------important-log----------"
      );
      break;
    case "error":
      consoleError(
        "---------important-log-----------\n\n",
        str,
        "\n\n----------important-log----------"
      );
      break;
    default:
      console.warn(
        "---------important-log-----------\n\n",
        str,
        "\n\n----------important-log----------"
      );
      break;
  }
};

//检查电话号码是否符合格式
const checkPhone = str => {
  if (/^1[3456789]\d{9}$/.test(str)) {
    return true;
  } else {
    Message.warning("电话号码不合法");
    return false;
  }
};

const checkData = (info, checkOption) => {
  let regBox = {
    regEmail: /^([a-z0-9_\.-]+)@([\da-z\.-]+)\.([a-z\.]{2,6})$/,
    //....邮箱
    regMobile: /^1[3456789]\d{9}$/ //....手机
  };

  if (checkOption.phone) {
    if (!info.phone) {
      showToast("请输入电话", { type: "error" });
      return false;
    } else {
      let mflag = regBox.regMobile.test(info.phone);

      if (!mflag) {
        showToast("请输入正确的手机号！", { type: "error" });
        return false;
      }
    }
  }

  if (checkOption.email) {
    if (!info.email && !info.buySenior) {
      showToast("请输入邮箱", { type: "error" });
      return false;
    } else {
      let mailflag = regBox.regEmail.test(info.email);

      if (!info.buySenior && !mailflag) {
        showToast("请输入正确的邮箱！", { type: "error" });
        return false;
      }
    }
  }

  return true;
};

//阿拉伯数字转中文数字
const numToChinese = num => {
  if (!/^\d*(\.\d*)?$/.test(num)) {
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
  var a = ("" + num).replace(/(^0*)/g, "").split("."),
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

//获取指定范围的随机整数
const randomNum = (minNum, maxNum) => {
  return parseInt(Math.random() * (maxNum - minNum + 1) + minNum, 10);
};

//判断是否未数字
const myIsNaN = value => {
  return typeof value === "number" && !isNaN(value) && value != "";
};

//通用提示函数,对标element,message
const showToast = (
  toast_word,
  {
    type = "success",
    duration = 3000, //duration为0代表永久
    afterClose = () => {},
    showObj = null,
    justConsole = false,
    dontShowConsole = false,
    showErrorConsole = false,
    showWarnConsole = true,
    dangerouslyUseHTMLString = false,
    showClose = true,
    customClass = ""
  } = {}
) => {
  if (showObj) {
    showObj = JSON.stringify(showObj);
  }
  if (justConsole) {
    if (type == "warning") {
      console.warn(toast_word, showObj??"");
    } else if (type == "error") {
      consoleError(toast_word, showObj??"");
    }
  } else {
    let message = toast_word + (showObj ? JSON.stringify(showObj) : "");
    if(isMobileBrowser()){
      //转换不同库的参数为同一类型
      type = {
        "primary":"primary",
        "success":"success",
        "warning":"warning",
        "error":"danger",
      }[type];
      Notify({
        message: message,
        type: type,
        duration: duration,
        dangerouslyUseHTMLString: dangerouslyUseHTMLString,
        showClose: showClose,
        customClass: customClass,
        onClose() {
          afterClose();
        }
      });
    }
    else{
      Message({
        message: message,
        type: type,
        duration: duration,
        dangerouslyUseHTMLString: dangerouslyUseHTMLString,
        showClose: showClose,
        customClass: customClass,
        onClose() {
          afterClose();
        }
      });
    }
    
    if(!dontShowConsole){
      if (type == "error" && showErrorConsole) {
        consoleError(toast_word, showObj??"");
      } else if(type == "warning" && showWarnConsole){
        console.warn(toast_word, showObj??"");
      }
      else{
        console.log(toast_word, showObj??"");
      }
    }
  }
};

//通用通知函数,对标element,Notification 
const showNotify = (
  toast_word,
  {
    title= "标题",
    type = "success",
    duration = 6000, //duration为0代表永久
    afterClose = () => {},
    showObj = null,
    justConsole = false,
    dontShowConsole = false,
    showErrorConsole = false,
    showWarnConsole = true,
    dangerouslyUseHTMLString = false,
    showClose = true,
    customClass = "",
    position = "top-right",
  } = {}
) => {
  if (showObj) {
    showObj = JSON.stringify(showObj);
  }
  if (justConsole) {
    if (type == "warning") {
      console.warn(toast_word, showObj??"");
    } else if (type == "error") {
      consoleError(toast_word, showObj??"");
    }
  } else {
    let message = toast_word + (showObj ? JSON.stringify(showObj) : "");
    if(!dontShowConsole){
      if (type == "error" && showErrorConsole) {
        consoleError(toast_word, showObj??"");
      } else if(type == "warning" && showWarnConsole){
        console.warn(toast_word, showObj??"");
      }
      else{
        console.log(toast_word, showObj??"");
      }
    }
    return Notification({
      message: message,
      title: title,
      type: type,
      duration: duration,
      dangerouslyUseHTMLString: dangerouslyUseHTMLString,
      showClose: showClose,
      customClass: customClass,
      position: position,
      onClose() {
        afterClose();
      }
    });
  }
};

//监听键盘事件
const listenKeyInput = (keyCode, callback) => {
  document.onkeydown = function(e) {
    console.warn("键盘监听");
    //事件对象兼容
    let e1 = e || event || window.event || arguments.callee.caller.arguments[0];
    if (keyCode instanceof Array) {
      let flag = false;
      loop(keyCode, item => {
        if (e1 && e1.keyCode == item) {
          flag = true;
        }
      });
      if (flag) {
        callback && callback();
      }
    } else {
      if (e1 && e1.keyCode == keyCode) {
        callback && callback();
      }
    }
  };
};

//触发自定义事件
//vue中需要在生命周期中绑定和解绑
//示例：mounted() {
//     window.addEventListener('closeActiveTag', this.closeActiveTag);
//   },
//   beforeDestroy() {
//     　window.removeEventListener('closeActiveTag',this.closeActiveTag)
//   },
const makeEvent = (eventName, param) => {
  let myEvent = new CustomEvent(eventName, param);
  // 随后在对应的元素上触发该事件
  if (window.dispatchEvent) {
    window.dispatchEvent(myEvent);
  } else {
    window.fireEvent(myEvent);
  }
};
const closeActiveTag = () => {
  // makeEvent("closeActiveTag", {
  //   detail: {
  //     title: "closeActiveTag"
  //   }
  // });s
  store.state.closeActiveTagFlag = true;
};

//根据父组件状态修改当前显示隐藏
const changeInterState = ({
  state = "默认状态名",
  flowName = "默认流程名",
  pageName = "def",
  that = null, //页面的this对象
  callback = () => {}
} = {}) => {
  if (!that) return Message.error("需要传页面this值");

  that.ifHandle = true;
  that.isShowUpload = false;
  that.isShowDel = false;

  console.warn("state", state, "flowName", flowName);

  switch (state) {
    case "资质申请":
      that.ifHandle = false;
      that.isShowUpload = true;
      that.isShowDel = true;
      that.showInterState = 0;
      break;
    case "申请个人资质":
    case "申请公司资质":
    case "发起社保证明申请":
      that.ifHandle = false;
      that.isShowUpload = true;
      that.isShowUpload_2 = true;

      that.choosedifHandle = false;
      that.isShowDel = true;
      that.isShowDel_2 = true;
      that.showInterState = 0;
      break;
    case "室经理审核":
      that.showInterState = 1;
      break;
    case "人力资源审核":
    case "人力资源审批":
      that.showInterState = 2;
      break;
    case "查看资质详情":
    case "资质申请结束":
    case "查看已变更资质详情":
    case "公司资质申请结束":
      that.showInterState = 3;
      break;
  }
  //页面特殊处理

  if (flowName.includes("资质申请")) {
    that.isShowUpload = false;
    that.isShowUpload_2 = false;
    that.isShowUpload_3 = false;
    that.isShowDel = false;
    that.isShowDel_2 = false;
    that.isShowDel_3 = false;
    that.ifDesensitization = true;

    switch (state) {
      case "申请个人资质":
      case "申请公司资质":
      case "发起社保证明申请":
        that.ifHandle = false;
        that.isShowUpload = true;
        that.isShowUpload_2 = true;
        that.isShowUpload_3 = true;

        that.choosedifHandle = false;
        that.isShowDel = true;
        that.isShowDel_2 = true;
        that.isShowDel_3 = true;

        that.showInterState = 0;
        break;
      case "人力资源审核":
      case "人力资源审批":
        that.isShowUpload_2 = true;
        that.isShowDel_2 = true;
        that.isShowUpload_3 = true;
        that.isShowDel_3 = true;
        that.ifDesensitization = false;
        that.fileUploadVisibleForSocial = true;
        break;
      case "人力资源审核查看":
      case "人力资源审批查看":
        that.ifDesensitization = false;
        that.fileUploadVisibleForSocial = true;
        break;
      case "资质申请结束":
        that.typeValue == 0
          ? (that.ifDownload = true)
          : (that.ifDownload = false);

        that.typeValue == 0
          ? (that.fileUploadVisibleForSocial = true)
          : (that.fileUploadVisibleForSocial = false);
        break;
      case "公司资质申请结束":
        that.typeValue == 0
          ? (that.ifDownload = true)
          : (that.ifDownload = false);
        break;
    }
  }

  callback();
  console.warn("页面changeInterState完毕");
};

//根据name值返回前端规定的流程状态
// 'start':发起 ,'process':审核中 ,'end':结束
// 其他string值：返回name作为特殊状态处理
const judgeFlowState = ({ name = "", id = "" } = {}) => {
  let state = "";
  if (name.indexOf("发起") > -1) {
    state = "start";
  } else if (name.indexOf("审核") > -1 || name.indexOf("审批") > -1) {
    state = "process";
  } else if (name.indexOf("结束") > -1) {
    state = "end";
  } else {
    state = name;
  }
  // console.warn("judgeFlowState完毕");
  return state;
};

// 通知外联界面回显数据
const echoData = ({
  jsondata = "回显的json键值数据",
  flowName = "",
  processName = "",
  that = null, //页面的this对象
  callback = () => {}
}) => {
  function informInterChangeChidren(json) {
    var columnSort = json;
    for (var i = 0; i < columnSort.length; i++) {
      var type = columnSort[i].type;
      if (type == "outVue") {
        var component = columnSort[i].component;
        console.log("component", component);
        // let ref_form = avueFormSpFlowCheck(that.processDefinitionId)
        //   .componentName
        //   ? that.$refs.formBox.$refs.form
        //   : that.$refs.form;
        //判断是否属于pageInterfaceFlowBox框架流程
        let ref_form = getRefFormCommon({
            key: that.processDefinitionKey
            ? that.processDefinitionKey
            : that.processDefinitionId,
            thatVm: that,
            useKeyCheck:that.processDefinitionKey
            ? true
            : false
        });

        if (ref_form?.$refs.hasOwnProperty(component)) {
          //更改界面值
          try {
            ref_form.$refs[component][0].$children[0].setInterJsonData(
              that.widgetModels,
              processName,
              flowName
            );
          } catch (e) {
            //TODO handle the exception
            console.warn(component + "调用出错");
          }
        }
      }
    }
  }
  //判断当前表单是否含有group字段
  if (that.taskFormJson.hasOwnProperty("group")) {
    for (var i = 0; i < that.taskFormJson.group.length; i++) {
      var column = that.taskFormJson.group[i].column;
      informInterChangeChidren(column);
    }
  }
  if (that.taskFormJson.hasOwnProperty("column")) {
    informInterChangeChidren(that.taskFormJson.column);
  }
  callback();
};

// 获取界面表单用户填写的数值
const getJsonDataByForm = ({
  booleanValid = true,
  that = null, //页面的this对象
  callback = () => {}
}) => {
  //获取子元素的数据
  function getChildren(jsonData) {
    var column = jsonData;
    var childrenJson = {};
    for (var j = 0; j < column.length; j++) {
      var type = column[j].type;
      if (type == "outVue") {
        let ref_form = getRefFormCommon({
            key: that.processDefinitionKey
            ? that.processDefinitionKey
            : that.processDefinitionId,
            thatVm: that,
            useKeyCheck:that.processDefinitionKey
            ? true
            : false
        });

        var component = column[j].component;
        if (ref_form?.$refs.hasOwnProperty(component)) {
          if (ref_form.$refs[component][0] != undefined) {
            ref_form.$refs[component][0].$children[0].getInterJsonData(
              booleanValid,
              that
            );
            var getJsonData =
              ref_form.$refs[component][0].$children[0].finalData;
            for (var key in getJsonData) {
              childrenJson[key] = getJsonData[key];
            }
          }
        }
      }
    }
    return childrenJson;
  }

  var processInstanceFormData = {};
  if (that.taskFormJson) {
    //在group中
    if (that.taskFormJson.hasOwnProperty("group")) {
      for (var i = 0; i < that.taskFormJson.group.length; i++) {
        var column = that.taskFormJson.group[i].column;
        processInstanceFormData = Object.assign(
          processInstanceFormData,
          getChildren(column)
        );
      }
    }

    if (that.taskFormJson.hasOwnProperty("column")) {
      var column = that.taskFormJson.column;
      processInstanceFormData = Object.assign(
        processInstanceFormData,
        getChildren(column)
      );
    }
  }
  that.formData = Object.assign(that.widgetModels, processInstanceFormData);
  callback(that.formData);
};

//暂存功能
const TSGeneral = ({
  flowKey = "流程key值",
  flowHandleState = "流程操作值", // 0-获取是否有暂存的数据  1-执行暂存操作 2-删除暂存的数据
  formJson = "表单json数据",
  processName = "", //流程步骤名
  flowName = "", //流程名
  that = null, //页面的this对象
  callback = () => {},
  showDeleteSuccess = false
} = {}) => {
  if (!that) return Message.error("需要传页面this值");

  switch (flowHandleState) {
    case 0:
      // 获取暂存数据
      apiHttp({
        url: "/workflow/flowable/processTask/cache/getWorkflow",
        param: {
          key: flowKey
        },
        completeCallBack() {},
        showLoading: true
      }).then(res => {
        if (res.msg != null && res.msg != "没有数据" && res.msg != "{}") {
          console.warn("设置暂存数据", flowKey);
          that.ifDelete = true;
          that.widgetModels = JSON.parse(res.msg);
          that.$nextTick(() => {
            //不加延迟会和验证反馈的inputRuleFail冲突
            store.state.curPageAvueForm_inputData = that.widgetModels;
          });
          // 回显数据
          echoData({
            jsondata: JSON.parse(res.msg),
            that: that,
            processName: processName,
            flowName: flowName
          });
          callback(JSON.parse(res.msg));
        } else {
          console.warn("该流程无暂存数据", flowKey);
          that.ifDelete = false;
        }
      });

      break;
    case 1:
      getJsonDataByForm({
        booleanValid: false,
        that,
        callback(formData) {
          formJson = formData;
          formJson.version = store.state.curPageAvueForm_version;
          apiHttp({
            url: "/workflow/flowable/processTask/cache/save",
            param: {
              key: flowKey,
              formJson: formJson
            },
            completeCallBack() {},
            showLoading: true
          }).then(data => {
            that.$message({
              message: "暂存成功",
              type: "success",
              duration: 1500
            });
          });
        }
      });

      break;
    case 2:
      apiHttp({
        url: "/workflow/flowable/processTask/cache/deleteWorkflow",
        param: {
          key: flowKey
        },
        completeCallBack() {},
        showLoading: true
      }).then(data => {
        if (showDeleteSuccess) {
          that.$message({
            message: "删除暂存成功",
            type: "success",
            duration: 1500
          });
        }
      });
      break;
  }

  console.warn("页面TSGeneral完毕");
};

//获取一天中时间开始和结束
const getTimeDayBeginOrEnd = ({
  dateObj = new Date(),
  type = "begin",
  returnObjType = "obj"
} = {}) => {
  if (typeof dateObj == "number") {
    dateObj = new Date(dateObj);
  }
  let hourNum, minNum;
  if (type == "begin") {
    hourNum = 0;
    minNum = 0;
  } else {
    hourNum = 23;
    minNum = 59;
  }
  return returnObjType == "obj"
    ? new Date(dateObj.setHours(hourNum, minNum))
    : dateObj.setHours(hourNum, minNum);
};
//获取当月开始和结束
const getMonthDayEnd = (targetDate = {}) => {
  let date = new Date(targetDate);
  let currentMonth = date.getMonth();
  let nextMonth = ++currentMonth;
  let nextMonthFirstDay = new Date(date.getFullYear(), nextMonth, 1);
  let oneDay = 1000 * 60 * 60 * 24;
  let lastDate = new Date(nextMonthFirstDay - oneDay);
  let endDate =
    lastDate.getFullYear() +
    "-" +
    (lastDate.getMonth() + 1 < 10 ? "0" : "") +
    (lastDate.getMonth() + 1) +
    "-" +
    (lastDate.getDate() < 10 ? "0" : "") +
    lastDate.getDate();

  return endDate;
};

//给该文件中函数参数带有showloading的使用,比如apiHttp,代码和showLoading函数一致
const showLoadingCopy = params => {
  let showLoadingInstance = showLoading(params);
  return showLoadingInstance;
};

//会根据loadingCount做多层级遮罩,loadingCount归0时关闭,需使用showLoadingClose方法
const showLoading = ({
  title = "请稍候",
  duration = 6000, //设置默认关闭时间
  mask = false,
  body = true,
  target = undefined,
  customClass = null,
  afterDisappear = () => {}
} = {}) => {
  let loading;
  if(isMobileBrowser()){
    loading = Toast.loading({
      message: title,
      forbidClick: mask,
      overlay:mask,
      loadingType: 'spinner',
    });
  }
  else{
    loading = Loading.service({
      lock: mask,
      text: title,
      spinner: "el-icon-loading",
      background: "rgba(0, 0, 0, 0.7)",
      body: body,
      target: target,
      customClass:customClass,
    });
  }
  
  utilParam.loadingCount += 1;
  console.log("增加多层级遮罩计数show.loadingCount", utilParam.loadingCount);
  
  let timeFlag;
  
  loading.$once("hook:destroyed",()=>{
    if(timeFlag){
      console.log("监听到遮罩关闭,且定时器还在,说明是主动关闭,关闭定时器,删除定时器标记",timeFlag);
      clearTimeout(timeFlag);
      timeFlag = null;
      if(utilParam.loadingCount !== 0){
        console.log("且此时计数不为0,主动计数归0", utilParam.loadingCount);
        utilParam.loadingCount = 0;
      }
    }
  });
  if (duration) {
    timeFlag = setTimeout(() => {
      console.log("执行定时关闭遮罩,删除定时器标记",duration,timeFlag);
      timeFlag = null;
      showLoadingClose(loading);
      afterDisappear();
    }, duration);
    console.log("遮罩定时器开始,标记",timeFlag);
  }
  return loading;
};

//多层级遮罩的关闭方法
const showLoadingClose = (loadingIns, {} = {}) => {
  if (utilParam.loadingCount > 0) {
    utilParam.loadingCount -= 1;
    console.log("减少多层级遮罩计数close.loadingCount", utilParam.loadingCount);
    utilParam.loadingCount = utilParam.loadingCount<0?0:utilParam.loadingCount;
  }
  if (utilParam.loadingCount === 0) {
    if(loadingIns.close){
      loadingIns.close();
    }
    else if(loadingIns.clear){
      loadingIns.clear();
    }
    console.log("遮罩计数close.loadingCount为0,关闭遮罩");
  }
};

//获取祖先组件中的值
const getParentsData = ({ that = null, dataName = "", loopNum = 100 } = {}) => {
  if (!that) return Message.error("需要传页面this值");

  let parentNode = that.$parent;
  for (let i = 0; i < loopNum; i++) {
    if (parentNode[dataName]) {
      console.warn(`在祖先组件找到的${dataName}为`, parentNode[dataName], i);
      return parentNode[dataName];
      break;
    } else if (parentNode.$parent) {
      parentNode = parentNode.$parent;
    } else {
      break;
    }
  }
  if (!parentNode || (parentNode && !parentNode[dataName])) {
    console.warn(`在祖先组件中未找到${dataName}`);
    return "";
  }
};

//获取祖先组件中的值
const getComFlowState = ({ that = null } = {}) => {
  let processName = getParentsData({
    that: that,
    dataName: "processName"
  });
  let state = judgeFlowState({ name: processName });
  return state;
};

//根据传过来的流程名，步骤名判断当前驳回状态是否显示
const getSendBackState = ({
  state = "默认状态名", //步骤名
  flowName = "默认流程名",
  taskDefinitionKey = "", //步骤Id
  that = null, //页面的this对象
  callback = () => {}
} = {}) => {
  if (!that) return Message.error("需要传页面this值");

  console.log("state:", state, "flowName:", flowName);

  flowName = global.flowKeyChangeFlowName({});

  if (flowName.includes("商机预评估")) {
    that.ifShowDoreject = true;
    switch (state) {
      case "项目经理发起评估":
        that.ifShowDoreject = false;
        break;
      case "市政企部经理经办":
      case "省政企部经理经办":
      case "省室经理":
      case "市室经理":
        that.ifStartAssign = true;
        break;
    }
  } else if (flowName.includes("短名单比选")) {
    that.ifShowDoreject = false;
    that.ifStart = true;
  } else if (flowName.includes("单项目公开招募")) {
    that.ifShowDoreject = false;
    that.ifStart = ture;
    if (state == "发起采购公告申请") {
      that.ifShowDoreject = false;
    }
  } else if (flowName.includes("应标")) {
    that.ifShowDoreject = false;
  } else if (flowName.includes("资质变更")) {
    switch (state) {
      case "业务管理员审批":
      case "ICT业务管理员审批":
      case "Activity_0fr7yqq":
        that.ifShowDoreject = true;
        break;
      default:
        that.ifShowDoreject = false;
        break;
    }
  } else if (flowName.includes("资质申请变更")) {
    switch (state) {
      case "业务管理员审批":
      case "ICT业务管理员审批":
      case "Activity_0fr7yqq":
        that.ifShowDoreject = true;
        break;
      default:
        that.ifShowDoreject = false;
        break;
    }
  } else if (flowName.includes("资质申请")) {
    switch (state) {
      case "室经理审核":
      case "Activity_1mce8uo":
      case "Activity_1ggdc1v":
        that.ifShowDoreject = true;
        break;
      case "综合部审核":
      case "Activity_037fj4b":
        that.ifShowDoreject = true;
        break;
      case "人力资源审核":
      case "Activity_0677ucr":
        that.ifShowDoreject = true;
        break;
      default:
        that.ifShowDoreject = false;
        break;
    }
  } else if (flowName.includes("项目立项")) {
    switch (state) {
      case "立项发起":
      case "Activity_0018has":
        that.ifShowDoreject = false;
        break;
      default:
        that.ifShowDoreject = true;
        break;
    }
  }
  // else if (flowName.includes("前向合同")) {
  //   switch (state) {
  //     case "客户经理发起":
  //     case "Activity_19w0vun":
  //       that.ifShowDoreject = false;
  //       break;
  //     default:
  //       that.ifShowDoreject = true;
  //       break;
  //   }
  // }
  else if (flowName.includes("成本支出计划编制")) {
    switch (state) {
      case "项目经理发起":
      case "Activity_0ei1zh1":
        that.ifShowDoreject = false;
        break;
      default:
        that.ifShowDoreject = true;
        break;
    }
  } else if (flowName.includes("收入计划")) {
    switch (state) {
      case "项目经理发起":
      case "Activity_1ekfk2d":
        that.ifShowDoreject = false;
        break;
      default:
        that.ifShowDoreject = true;
        break;
    }
  } else if (flowName.includes("方案库下载申请")) {
    switch (state) {
      case "方案下载审核":
      case "Activity_11brapo":
        that.ifShowDoreject = true;
        break;
      default:
        that.ifShowDoreject = false;
        break;
    }
  } else if (flowName.includes("案例库下载申请")) {
    switch (state) {
      case "案例下载审核":
      case "Activity_0vj40xj":
        that.ifShowDoreject = true;
        break;
      default:
        that.ifShowDoreject = false;
        break;
    }
  } else if (flowName.includes("个人资质申请")) {
    switch (state) {
      case "资质审核":
      case "Activity_14iaw9z":
        that.ifShowDoreject = true;
        break;
      case "人力资质审核":
      case "Activity_1fxkzl8":
        that.ifShowDoreject = true;
        break;
      case "政企资质审核":
      case "Activity_1kywt3i":
        that.ifShowDoreject = true;
        break;
      default:
        that.ifShowDoreject = false;
        break;
    }
  } else if (flowName.includes("公司资质申请")) {
    switch (state) {
      case "资质审核":
      case "Activity_14iaw9z":
        that.ifShowDoreject = true;
        break;
      case "第一审核":
      case "人力资质审核":
      case "Activity_1fxkzl8":
        that.ifShowDoreject = true;
        break;
      case "第二审核":
      case "政企资质审核":
      case "Activity_1kywt3i":
        that.ifShowDoreject = true;
        break;
      default:
        that.ifShowDoreject = false;
        break;
    }
  } else if (flowName.includes("资质发起申请")) {
    switch (state) {
      case "资质审核":
      case "Activity_14iaw9z":
      case "人力资质审核":
      case "Activity_1fxkzl8":
      case "政企资质审核":
      case "Activity_1kywt3i":
        that.ifShowDoreject = true;
        break;
      default:
        that.ifShowDoreject = false;
        break;
    }
  } else if (flowName.includes("售前售中交接确认")) {
    switch (state) {
      case "网络部确认":
      case "projectOnSaleHandover_mid1":
        that.ifShowDoreject = true;
        break;
      default:
        that.ifShowDoreject = false;
        break;
    }
  } else if (flowName.includes("初验进度确认")) {
    switch (state) {
      case "项目经理确认":
        that.ifShowDoreject = true;
        break;
      default:
        that.ifShowDoreject = false;
        break;
    }
  } else {
    that.ifShowDoreject = false;
    that.ifStart = false;
  }

  //根据步骤ID判断
  if (taskDefinitionKey) {
    if (taskDefinitionKey.includes("_start")) {
      that.ifShowDoreject = false;
    } else if (
      taskDefinitionKey.includes("collectionPlanChange_mid") ||
      taskDefinitionKey.includes("expenditurePlanChange_mid") ||
      taskDefinitionKey.includes("incomePlanChange_mid") ||
      taskDefinitionKey.includes("projectInfoChange_mid")
    ) {
      //特殊处理流程
      that.ifShowDoreject = true;
    } else if (taskDefinitionKey.includes("_showReject")) {
      that.ifShowDoreject = true;
    }
  }

  callback();
  console.warn("页面getSendBackState完毕");
};

//获取一个函数的参数名和方法体
const getParameterNamesAndBody = fn => {
  if (typeof fn !== "function") return [];
  var COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/gm;
  var code = fn.toString().replace(COMMENTS, "");
  var result = code
    .slice(code.indexOf("(") + 1, code.indexOf(")"))
    .match(/([^\s,]+)/g);
  let entire = fn.toString();
  let func_body_str = entire.substring(
    entire.indexOf("{") + 1,
    entire.lastIndexOf("}")
  );
  return result === null
    ? { params: [], body: func_body_str }
    : { params: result, body: func_body_str };
};

//深相等
const deepEqual = function(x, y) {
  // 指向同一内存时
  if (x === y) {
    return true;
  } else if (
    typeof x == "object" &&
    x != null &&
    typeof y == "object" &&
    y != null
  ) {
    if (Object.keys(x).length != Object.keys(y).length) return false;

    for (var prop in x) {
      if (y.hasOwnProperty(prop)) {
        if (!deepEqual(x[prop], y[prop])) return false;
      } else return false;
    }

    return true;
  } else return false;
};

//根据是否为自定义验证，进行字符串到函数的转换
const checkRuleIfCustom = rule => {
  try {
    loop(rule, (item, index) => {
      if (item.validator && item.validator.params && item.validator.body) {
        item.validator = new Function(
          item.validator.params,
          item.validator.body
        );
        //console.warn(`validator`, rule);
      }
    });
    return rule;
  } catch (error) {
    consoleError(``, error);
    return [];
  }
};

// 导出excel文件
const exportExcel = ({
  fileName = "默认文件名",
  paramData = null, //参数
  urlData = "/workflow/flowable/generalWorkflowInterface/currencyExport",
  method = "post",
  showLoading = true,
  loadingDuration = 0,//最长遮罩时间,0代表无最长时间
  callback = () => {}
} = {}) => {
  var parmJson = {};

  if (method == "post") {
    parmJson = {
      url: urlData,
      method: method,
      data: paramData,
      responseType: "blob"
    };
  } else {
    parmJson = {
      url: urlData,
      method: method,
      params: paramData,
      responseType: "blob"
    };
  }
  if (showLoading) {
    // var loading = Loading.service({
    //   lock: true,
    //   text: "请稍候",
    //   spinner: "el-icon-loading",
    //   background: "rgba(0, 0, 0, 0.7)",
    //   fullscreen: true
    // });
    var loading = showLoadingCopy({
      duration:loadingDuration,
      mask: true
    });
  }
  request(parmJson)
    .then(response => {
      callback();
      var filename = fileName;
      const type = response.type || "";
      if (type.includes("application/json")) {
        let reader = new FileReader();
        reader.onload = e => {
          if (e.target.readyState === 2) {
            let res = {};
            res = JSON.parse(e.target.result);
            Message.error(res.msg);
          }
        };
        reader.readAsText(response);
      } else {
        filename = decodeURI(filename);
        if (typeof window.navigator.msSaveBlob !== "undefined") {
          window.navigator.msSaveBlob(response, filename);
        } else {
          var blobURL = window.URL.createObjectURL(response); // 将blob对象转为一个URL
          var tempLink = document.createElement("a"); // 创建一个a标签
          tempLink.style.display = "none";
          tempLink.href = blobURL;
          tempLink.setAttribute("download", filename); // 给a标签添加下载属性
          if (typeof tempLink.download === "undefined") {
            tempLink.setAttribute("target", "_blank");
          }
          document.body.appendChild(tempLink); // 将a标签添加到body当中
          tempLink.click(); // 启动下载
          document.body.removeChild(tempLink); // 下载完毕删除a标签
          window.URL.revokeObjectURL(blobURL);
        }
      }

    })
    .catch(error => {
      console.log(error);
    })
    .finally(() => {
      if (showLoading) {
        showLoadingClose(loading);
      }
    });
};

const exportFileDownload = ({
  fileName = "默认文件名",
  filedata = null,
  callback = () => {}
} = {}) => {
  let response = filedata;

  console.log("filename", filename);

  const type = response.type || "";
  if (type.includes("application/json")) {
    let reader = new FileReader();
    reader.onload = e => {
      if (e.target.readyState === 2) {
        let res = {};
        res = JSON.parse(e.target.result);
        Message.error(res.msg);
      }
    };
    reader.readAsText(response);
  } else {
    filename = decodeURI(filename);
    if (typeof window.navigator.msSaveBlob !== "undefined") {
      window.navigator.msSaveBlob(response, filename);
    } else {
      var blobURL = window.URL.createObjectURL(response); // 将blob对象转为一个URL
      var tempLink = document.createElement("a"); // 创建一个a标签
      tempLink.style.display = "none";
      tempLink.href = blobURL;
      tempLink.setAttribute("download", filename); // 给a标签添加下载属性
      if (typeof tempLink.download === "undefined") {
        tempLink.setAttribute("target", "_blank");
      }
      document.body.appendChild(tempLink); // 将a标签添加到body当中
      tempLink.click(); // 启动下载
      document.body.removeChild(tempLink); // 下载完毕删除a标签
      window.URL.revokeObjectURL(blobURL);
    }
  }
};

//深循环对象的所有属性，直到属性值为基本属性
const loopDeep = (obj, callback,{returnPathObjArr=false,pushArrayTypeToPathArr=false,pathObjArr=null,useByOut=true}={}) => {
  if (typeof obj !== "object") {
    console.log("loopDeep对象必须为object");
    return;
  }
  try {
    for (let i in obj) {
      if(returnPathObjArr && useByOut){
        pathObjArr = [];
      }
      if (obj[i] === null) {
        let flag = callback(obj[i], i, obj, pathObjArr);
        if (flag == "break") {
          return flag;
        }
      } else if (typeof obj[i] !== "object") {
        let flag = callback(obj[i], i, obj, pathObjArr);
        if (flag == "break") {
          return flag;
        }
      } else if (typeof obj[i] === "object") {
        if(returnPathObjArr){
          if(pushArrayTypeToPathArr === true){
            pathObjArr.push(obj);
          }
          else if(Array.isArray(obj) === false){
            pathObjArr.push(obj);
          }
        }
        let flag = loopDeep(obj[i], callback,{returnPathObjArr:returnPathObjArr,pathObjArr:pathObjArr,useByOut:false});
        if (flag == "break") {
          return flag;
        }
      } else {
        let flag = callback(obj[i], i, obj, pathObjArr);
        if (flag == "break") {
          return flag;
        }
      }
    }
  } catch (error) {
    consoleError(`深循环时出错`, obj, error);
  }
};
// 脱敏
const desensitizationMethod = ({
  str = "",
  beginLen = 2,
  endLen = -2,
  callback = () => {}
} = {}) => {
  if (str == null) {
    return "";
  }
  str = str.toString();
  var len = str.length;

  var firstStr = "";
  // 当str数值出现错误时，特殊处理
  if (firstStr <= len) {
    firstStr = str.substr(0, beginLen);
  }

  var lastStr = "";
  if (Math.abs(endLen) <= len) {
    lastStr = str.substr(endLen);
  }
  var middleStr = str
    .substring(beginLen, len - Math.abs(endLen))
    .replace(/[\s\S]/gi, "*");
  var tempStr = firstStr + middleStr + lastStr;

  return tempStr;
};
//获取所有字典
const getAllDictListFormat = ({ refresh = false ,showLoading=false} = {}) => {
  return new Promise(async (resolve, reject) => {
    store.state.onGetAllDictList = true;//标志位开始
    let cascaderDictList = await getAllCascaderDictListFormat({ refresh:refresh, showLoading: showLoading });
    let dicList = Object.assign({}, cascaderDictList);
    setFrontCustomDict({dicList:dicList});
    dicList = Object.assign({}, dicList, cascaderDictList);
    //在store中设置，以在底层组件中调用
    isDev && console.log(`全局字典`, copy2(dicList));
    store.state.dicList = dicList;
    store.state.onGetAllDictList = false;//标志位结束
    resolve();
    //2022-11-28,放弃原有的getAllDictType接口
    //原有接口不需要了,从新接口中获取全部
    /* //防止未加载前完成前调用字典
    let url = "/ict-informationRSC/ictPlanStore/getAllDictType";
    let storageData = JSON.parse(
      localStorage.getItem(
        "storage" + url
      )
    );
    store.state.dicList = storageData;
    if (refresh) {
      localStorage.removeItem(
        "storage" + url
      );
    }
    let dicList = {};
    await apiHttp({
      url: url,
      param: {},
      showLoading: showLoading,
      loadingWord:"系统字典获取中",
      storageTime: refresh ? null : 1000 * 60 * 10,
      //用于后端不开字典服务等时的临时236调用地址
      //记录:限制,字典接口也需要权限验证才能调用,所以不能用这个临时调用
      //useTempBaseURL:isDevelopment?"/addr236":null,
      completeCallBack() {
        store.state.onGetAllDictList = false;
      },
      failCallBack(){
        showToast(`字典获取失败,请联系管理人员`,{type:"error"});
      },
    }).then(res => {
      loop(res, (item, index) => {
        if (!dicList[item.dictType]) {
          dicList[item.dictType] = [];
        }
        dicList[item.dictType].push(item);
      });

      // let dicListMap = new Map();
      // loop(dicList,(item,index)=>{
      //   let mapItem = new Map();
      //   loop(item,(item2,index2)=>{
      //     mapItem.set(item2.dictValue,item2.dictLabel);
      //   });
      //   dicListMap.set(index,mapItem);
      // });
    }); 
    resolve();
    */

    
  })
};
const set2LevelDict = ({ setDictName, dicList, level1DictName } = {}) => {
  //添加处理后的二级商机标签行业字典,
  let level2Dict;
  try {
    level2Dict = copy(dicList[level1DictName]);
    loop(level2Dict, (item, index) => {
      item.children = dicList[item.value];
    });
    // console.warn(`city_and_county`,cityAndCounty);
    dicList[setDictName] = level2Dict; //市县级联字典
    dicList[setDictName + "Flat"] = objArrFlat(level2Dict);
  } catch (error) {
    consoleError(`设置转换二级字典报错`, error);
  }
  return level2Dict;
};
//获取所有普通和级联字典
const getAllCascaderDictListFormat = ({ refresh = false ,showLoading=false} = {}) => {
  return new Promise((resolve, reject) => {
    //防止未加载前完成前调用字典
    let url = "/ict-informationRSC/common/dict/dictTree";
    let storageData = JSON.parse(
      localStorage.getItem(
        "storage" + url
      )
    );
    store.state.dicList = storageData;
    if (refresh) {
      localStorage.removeItem(
        "storage" + url
      );
    }
    apiHttp({
      url: url,
      //useTempBaseURL:"/proxyapi",
      param: {},
      showLoading: showLoading,
      loadingWord:"系统字典获取中",
      storageTime: refresh ? null : 1000 * 60 * 10,
      codeErrorFailCallBack: true,
      failCallBack:(res)=>{},
      completeCallBack:(res)=>{},
    }).then(res => {
      let dicList = res.datas;
      //做处理
      loop(dicList, dic_item => {
        loop(dic_item, (item, index) => {
          item.dictLabel = item.label??item.dictLabel;
          item.dictValue = item.value??item.dictValue;
          loopDeep(item,(item2, index2, propBelongObj)=>{
            if (
              propBelongObj["children"] &&
              propBelongObj["children"].length === 0
            ) {
              propBelongObj["children"] = undefined; //会导致显示多一级,后端无法处理,先临时处理
            }
          });
        });
      });
      resolve(dicList);
    });
  })
};
//一些额外前端自己的字典
const setFrontCustomDict = ({
  dicList,
})=>{
  if(!dicList){
    return this.$util.showToast(`字典对象不存在`,{type:"error"});
  }
  //一些额外的字典设置
  //测试用字典
  let testOptions = [
    { label: "测试选项1", value: "20" },
    { label: "测试选项2", value: "22" }
  ];
  dicList["testOptions"] = testOptions;
  //是否
  let booleanOptions = [
    { label: "是", value: true },
    { label: "否", value: false }
  ];
  dicList["booleanOptions"] = booleanOptions;
  //做处理
  loop(dicList, dic_item => {
    loop(dic_item, (item, index) => {
      item.label = item.dictLabel !== undefined ? item.dictLabel : item.label;
      item.value = item.dictValue !== undefined ? item.dictValue : item.value;
    });
  });
  //添加处理后的二级商机标签行业字典,
  let cityAndCounty = set2LevelDict({
    setDictName: "cityAndCounty",
    dicList: dicList,
    level1DictName: "sys_city"
  });
  set2LevelDict({
    setDictName: "allOptionForOppLabel",
    dicList: dicList,
    level1DictName: "profession_option_for_opp_label"
  });
  // console.warn(`cityAndCountyFlat`,dicList["cityAndCountyFlat"]);
  try {
    if(dicList["xsdj"] && dicList["xsdj"]?.length>0){
      dicList[dicList["xsdj"][2].value] = cityAndCounty; //县级级联字典
      dicList[dicList["xsdj"][1].value] = dicList["sys_city"]; //市级级联字典
    }
    else{
      showToast(`部分应该存在的字典接口未返回,请联系后端开发人员检查字典接口问题`,{type:"warning"});
      consoleError("线索等级字典不存在,应该是后端字典接口出问题或者后端正在更新导致字典接口读取错误,后端接口恢复后,等待10分钟或者主动删除字典缓存后重新读取即可");
    }

  } catch (error) {
    consoleError(`级联字典赋值错误`, error);
    dicList["县级"] = cityAndCounty; //县级级联字典
    dicList["市级"] = dicList["sys_city"]; //市级级联字典
  }
};
//获取登录用户额地市ID
const getUserBelongCityId = (obj, callback) => {
  apiHttp({
    url: "/workflow/flowable/generalWorkflowInterface/getCity",
    param: {},
    showLoading: false,
    // storageTime: 1000*60*30,
    completeCallBack() {}
  }).then(res => {
    let belongCityId = res.data.cityId;
    let belongCountyId = res.data.countyId;
    let belongAreaId = res.data.areaId;

    console.warn(`获取登录用户地市`, belongCityId, belongCountyId);
    store.state.belongCityId = belongCityId;
    store.state.belongCountyId = belongCountyId;
    //增加改版后的区县字段
    store.state.belongAreaId = belongAreaId;
    console.warn(
      `以及用户等级provinceUser,`,
      res.data.provinceUser,
      "cityUser",
      res.data.cityUser,
      "areaUser",
      res.data.areaUser
    );
    store.state.getCityApiObj = res.data;
    // 获取  this.$store.state.belongCityId
  });
};

//获取处理后的html
const parseHtml = html => {
  html = html.replace(/\n/g, "<br/>");
  html = html.replace(/ /g, "&nbsp;");
  // console.log(html);
  return html;
};
//找到对象中为指定值的指定属性所在的对象//默认查找prop对象
//let projectInfoAfter = this.$util.findPropBelongItem({
//   obj: taskFormJson,
//   findPropName: "prop",
//   findPropVal: "projectInfoAfter",
// });
const findPropBelongItem = ({
  obj,
  findPropName = "prop",
  findPropVal,
  returnPathObjArr,
  returnPathByObjProp,
} = {}) => {
  let findItem,findItemPathObjArr;
  if (findPropName && findPropVal) {
    //找指定属性和值对应的
    loopDeep(obj, (propVal, propName, propBelongObj, pathObjArr) => {
      if (propName == findPropName && propVal == findPropVal) {
        findItem = propBelongObj;
        if(returnPathObjArr){
          findItemPathObjArr = pathObjArr;
        }
        return "break";
      }
    },{returnPathObjArr:returnPathObjArr});
  } else if (findPropName && !findPropVal) {
    //只找指定属性
    loopDeep(obj, (propVal, propName, propBelongObj, pathObjArr) => {
      if (propName == findPropName) {
        findItem = propBelongObj;
        if(returnPathObjArr){
          findItemPathObjArr = pathObjArr;
        }
        return "break";
      }
    },{returnPathObjArr:returnPathObjArr});
  } else if (!findPropName && findPropVal) {
    //只找指定值
    loopDeep(obj, (propVal, propName, propBelongObj, pathObjArr) => {
      if (propVal == findPropVal) {
        findItem = propBelongObj;
        if(returnPathObjArr){
          findItemPathObjArr = pathObjArr;
        }
        return "break";
      }
    },{returnPathObjArr:returnPathObjArr});
  }

  if(returnPathObjArr){
    findItemPathObjArr.push(findItem);
    if(returnPathByObjProp){
      findItemPathObjArr = findItemPathObjArr.map(item=>item[returnPathByObjProp])
    }
    if(Array.isArray(findItemPathObjArr)){
      return findItemPathObjArr;
    }
    else{
      console.warn(
        `在obj中找不到对应属性和值的所属路径`,
      );
      return [];
    }
  }
  else{
    if (!findItem) {
      return console.warn(
        `在obj中找不到对应属性和值的对象`,
        findPropName,
        findPropVal,
        obj
      );
    }
    else{
      return findItem;
    }
  }
  
};
//通用的表单验证方法，设置值为inputRuleFail表示检测不通过
const formCheck = (
  inputData,
  { pageConfig, tip = "请填写完整", showConsole = true } = {}
) => {
  let dataCheckFlag = true,
    failCheckProp = "",
    failCheckPropTip = "",
    failCheckPropBelongObj = {};
  loopDeep(inputData, (prop_val, prop_name, propBelongObj) => {
    if (prop_val == "inputRuleFail") {
      dataCheckFlag = false;
      failCheckProp = prop_name;
      failCheckPropBelongObj = propBelongObj;
      return "break";
    }
  });
  if (dataCheckFlag) {
    return true;
  } else {
    /* if (pageConfig) {
      failCheckProp = failCheckProp.replace("_inputRuleFail", "");
      let findItem = findPropBelongItem( {
        obj:pageConfig,
        findPropVal:failCheckProp,
      });
      failCheckPropTip = findItem?findItem.label:isDevelopment?failCheckProp:'';
    } */
    try {
      failCheckProp = failCheckProp.replace("_inputRuleFail", "");
      failCheckPropTip = failCheckPropBelongObj[
        failCheckProp + "_inputRuleFailLabel"
      ]
        ? failCheckPropBelongObj[failCheckProp + "_inputRuleFailLabel"]
        : isDevelopment
        ? failCheckProp
        : "";
    } catch {}
    if (showConsole) {
      if (failCheckPropTip) {
        console.warn(
          `表单-${failCheckPropTip}-值为inputRuleFail,阻止更新`,
          inputData
        );
      } else {
        console.warn(
          `formCheck验证中组件值出现inputRuleFail,阻止更新`,
          inputData
        );
      }
    }
    if (tip) {
      if (failCheckPropTip) {
        tip = tip + `（位置提示：${failCheckPropTip}）`;
        //后续考虑加上自动跳转,需要id或者传递ref元素
        //pageScrollToEle({refEle:document.getElementsByClassName("input-extend")[20]})
        if(isDev){//开发环境自动滚动
          let ele = document.querySelector(`[float-nav-label="${failCheckPropTip}"]`);
          ele && pageScrollToEle({
            refEle:ele,
            behavior:"smooth",
            block:"center",
            //inline:"nearest",
          });
          
        }
        
      }
      showToast(tip, { type: "error" });
      if(isDev){
        console.log(failCheckProp,copy2(inputData));
      }
    }
    return false;
  }
};
//通用的表单验证方法，设置值为inputRuleFail表示检测不通过
const formCheckSpecial = (
  { tip = "请检查表单", eventName="beforeSubmitCheck" } = {}
) => {
  let flagObj = {flag:true,msg:tip};
  Vue.prototype.$eventHub.$emit(eventName,flagObj);
  if(flagObj.flag === false){
    flagObj.msg && showToast(flagObj.msg,{type:"error"});
    return false;
  }
  else{
    return true;
  }
};
//通用的去除表单中inputRuleFail方法
const deleteInputRuleFail = inputData => {
  let flag = false;
  loopDeep(inputData, (prop_val, prop_name, propBelongObj) => {
    if (prop_val == "inputRuleFail") {
      delete propBelongObj[prop_name];
      if (prop_name.indexOf("_inputRuleFail") > -1) {
        delete propBelongObj[prop_name + "Label"];
      }
      flag = true;
    }
  });
  if (flag) {
    console.log("表单数据中存在inputRuleFail,进行去除");
  }
};
// 通用删除表单中值为‘’的情况，
const deleteInputStringNul = inputData => {
  let flag = false;
  loopDeep(inputData, (prop_val, prop_name, propBelongObj) => {
    if (prop_val == "") {
      propBelongObj[prop_name] = null
      flag = true;
    }
  });
  if (flag) {
    console.log("表单数据中存在'',进行去除");
  }
};

//上传文件的查看、下载、上传相关
const viewFile = (
  {
    param = {},
    queryAddr = "/ict-informationRSC/sysAccessoryFile/viewFile"
  } = {},
  success = () => {}
) => {
  console.log("预览文件的id为：", param.id);
  if (!param.id) {
    return showToast(`文件id不存在`, { type: "error" });
  }
  apiHttp({
    url: queryAddr,
    param: param,
    method: "GET",
    showLoading: false,
    repeatCheck: true,
    completeCallBack() {}
  }).then(res => {
    if (res.status) {
      window.open(
        Vue.prototype.baseURL +
          "ict-perveiw/onlinePreview?url=" +
          encodeURIComponent(res.fileUrl) +
          (res.watermarkTxt
            ? "&watermarkTxt=" + encodeURIComponent(res.watermarkTxt)
            : "")
      );
      success();
    } else {
      Message.error(res.errMsg);
    }
  });
};
const downloadFile = ({
  param = {},
  fileName = "",
  fileType = "",
  queryAddr = "",
  showLoading = false,
  multiDownload = false, //多选批量下载
  postUseQuery = true, //链接后面追加参数
  method = ""
} = {}) => {
  if (multiDownload) {
    console.log("批量下载模式,下载文件,id为拼接字符串：", param.id);
    queryAddr = queryAddr
      ? queryAddr
      : "/ict-informationRSC/sysAccessoryFile/downloadByIds";
    if (
      queryAddr == "/ict-informationRSC/sysAccessoryFile/downloadByIds" &&
      !param.id
    ) {
      return showToast(`参数id不存在`, { type: "error" });
    }
  } else {
    console.log("单独下载模式,下载文件的fileId为：", param.fileId);
    queryAddr = queryAddr
      ? queryAddr
      : "/ict-informationRSC/sysAccessoryFile/downFile";
    if (
      queryAddr == "/ict-informationRSC/sysAccessoryFile/downFile" &&
      !param.fileId
    ) {
      return showToast(`参数fileId不存在`, { type: "error" });
    }
  }
  if (fileName.split(".")[1]) {
    fileName = fileName.split(".")[0];
  }
  if(isMobileBrowser()){
    //下载需要做的参数生成和处理
    //queryAddr加上request-uri和Authorization,base64之后作为额外参数
    let apiUrl = "ict-informationRSC/sysAccessoryFile/downFileByUrlAuthorization";
    queryAddr = Vue.prototype.baseURL+apiUrl;
    let authObj = makeAuthorization({
      method:"GET",
      baseURL:Vue.prototype.baseURL,
      url:apiUrl,
    });
    queryAddr += `&urlAuthorization=${authObj.urlAuthorization}`;
    queryAddr += `&requestUrl=${authObj.requestUrl}`;

    //提供的下载调用
    let downloadurl = encodeURI(queryAddr);
    try {
        //downloadurl:文件下载地址
        //filename:文件名
        MPFileOpener.openAfterDownload(downloadurl, fileNameTemp, function (params) {
            showToast(`下载成功`,{type:"success"});
        }, function (params) {
            showToast(`下载失败`,{type:"error"});
        });
    } catch (e) {
        //附件下载方法异常
        showToast(`下载出错`,{type:"error"});
    }
  }
  else{
    apiHttp({
      url: queryAddr,
      param: param,
      method: method ? method : multiDownload ? "GET" : "POST",
      postUseQuery: postUseQuery,
      showLoading: showLoading,
      repeatCheck: true,
      responseType: "blob",
      completeCallBack() {}
    }).then(response => {
      let fileNameTemp = fileName + (fileType ? "." + fileType : "");
      const type = response.type || "";
      if (type.includes("application/json")) {
        let reader = new FileReader();
        reader.onload = e => {
          if (e.target.readyState === 2) {
            let res = {};
            res = JSON.parse(e.target.result);
            Message.error(res.msg);
          }
        };
        reader.readAsText(response);
      } else {
        fileNameTemp = decodeURI(fileNameTemp);
        if (typeof window.navigator.msSaveBlob !== "undefined") {
          window.navigator.msSaveBlob(response, fileNameTemp);
        } else {
          let blobURL = window.URL.createObjectURL(response); // 将blob对象转为一个URL
          let tempLink = document.createElement("a"); // 创建一个a标签
          tempLink.style.display = "none";
          tempLink.href = blobURL;
          tempLink.setAttribute("download", fileNameTemp); // 给a标签添加下载属性
          if (typeof tempLink.download === "undefined") {
            tempLink.setAttribute("target", "_blank");
          }
          document.body.appendChild(tempLink); // 将a标签添加到body当中
          tempLink.click(); // 启动下载
          document.body.removeChild(tempLink); // 下载完毕删除a标签
          window.URL.revokeObjectURL(blobURL);
        }
      }
    });
  }
};
const uploadFile = params => {
  //写在通用上传组件中
  //请使用上传通用组件
};

//删除服务器上传的文件
const deleteFile = ({fileId,showMsg=true}={})=>{
  let url = "/ict-informationRSC/sysAccessoryFile/delFile";
  let param = {};
  //该接口参数为直接加在url后拼接
  if(!fileId){
    return showToast(`要删除的文件id不存在`,{type:"error"});
  }
  url+=`?ids=${fileId}`;
  apiHttp({
    url:url,
    param:param,
    method:'POST',
    showLoading: true,
    loadingWord: "请稍候",
    repeatCheck: false,
    codeErrorFailCallBack: true,
    failCallBack:(res)=>{},
    completeCallBack:(res)=>{},
    //setTestData:{},
  }).then(res => {
    showMsg && showToast("删除成功");
  });
};

const dictionaryChange = ({
  type = "地市",
  typeValue = "591",
  param = "sys_city",
  callback = () => {}
} = {}) => {
  var dicList = store.state.dicList;
  if (dicList != null && dicList.hasOwnProperty(param) == true) {
    let arrayJson = store.state.dicList[param];
    for (var i in arrayJson) {
      if (arrayJson[i].dictValue == typeValue) {
        return arrayJson[i].dictLabel;
      }
    }
  } else {
    return "";
  }
};

const ChineseDictionaryChange = ({
  type = "地市",
  typeValue = "591",
  param = "sys_city",
  callback = () => {}
} = {}) => {
  let arrayJson = store.state.dicList[param];
  console.warn("arrayJson", arrayJson);

  if (type == "省级") {
    type = "福建省";
  }
  for (var i in arrayJson) {
    if (arrayJson[i].dictLabel == type) {
      return arrayJson[i].dictValue;
    }
  }
};

/* 截取文件名 */
const interceptedFilename = ({
  paramName = "默认名",
  filtrSymbol = "\\",
  callback = () => {}
} = {}) => {
  var name = paramName;
  if (paramName.indexOf(filtrSymbol) >= 0) {
    name = paramName.substring(paramName.lastIndexOf(filtrSymbol) + 1);
  }
  return name;
};

const diffPropVal = (obj1, obj2, ignoreArr = []) => {
  //深度比较并返回两个对象的不同，返回不同属性数组
  var o1 = obj1 instanceof Object;
  var o2 = obj2 instanceof Object;
  // 判断是不是对象
  if (!o1 || !o2) {
    return obj1 === obj2;
  }

  //Object.keys() 返回一个由对象的自身可枚举属性(key值)组成的数组,
  //例如：数组返回下表：let arr = ["a", "b", "c"];console.log(Object.keys(arr))->0,1,2;
  // if (Object.keys(obj1).length !== Object.keys(obj2).length) {
  //   return false;
  // }

  let arr = [];
  for (let o in obj1) {
    if (ignoreArr.includes(o)) {
      continue;
    }
    let t1 = obj1[o] instanceof Object;
    let t2 = obj2[o] instanceof Object;
    let t1_arr = obj1[o] instanceof Array;
    let t2_arr = obj2[o] instanceof Array;
    if (t1 && t2 && !t1_arr && !t2_arr) {
      //假如都为对象
      arr = arr.concat(diffPropVal(obj1[o], obj2[o]));
    } else if (t1_arr && t2_arr) {
      if (
        !judgeArrEqual({
          arr1: obj1[o],
          arr2: obj2[o]
        })
      ) {
        arr.push(o);
      }
    } else if (obj1[o] !== obj2[o]) {
      // console.warn("不同属性为",o,"，值为",obj1[o],obj2[o])
      arr.push(o);
    }
  }
  if (arr.length > 0) {
    console.warn(`不同属性为`, arr);
  }
  return arr;
};

//转换值为label
const valChangeToLabel = ({
  val,
  dicListName,
  labelChangeToVal,
  isMultipleString = false,
  splitSymbol = ","
} = {}) => {
  let dataGroup = store.state.dicList[dicListName];
  if (!dataGroup) {
    consoleError("指定字典不存在", dicListName);
    return val;
  }
  if (!isMultipleString) {
    let valLabel = dataGroup.find(item3 => {
      //同时兼容数字字典值向字符串转换
      //兼容，值或者key对应均可//同时兼容数字字典值向字符串转换,==兼容
      return val == item3.value || val == item3.label;
    });
    // store.state.dicListMap.get(dicListName).get(val);

    if (!valLabel) {
      if(val){
        console.warn(
          "查不到字典对应值",
          val,
          dicListName,
          // JSON.stringify(dataGroup)
        );
      }
      else{
        console.log("值为空值,无法转换",val, dicListName);
      }
      
      return val;
    } else if (labelChangeToVal) {
      return valLabel.value;
    } else {
      return valLabel.label;
    }
  } else {
    try {
      let label = "";
      if (typeof val === "object") {
        console.warn("转换值为数组,尝试用join(',')先转为字符串", val);
        val = val.join();
      }
      let splitArr = val.split(splitSymbol);
      loop(splitArr, (child_item, child_index) => {
        let findItem = dataGroup.find((item, index) => {
          return item.value == child_item || item.label == child_item; //兼容，值或者key对应均可
        });
        let child_label = findItem ? findItem.label : child_item;
        label +=
          child_label + (child_index == splitArr.length - 1 ? "" : splitSymbol);
      });
      // store.state.dicListMap.get(dicListName).get(val);

      if (!label) {
        console.warn(
          "查不到字典对应值",
          val,
          dicListName,
          // JSON.stringify(dataGroup)
        );
        return val;
      } else {
        return label;
      }
    } catch (error) {
      consoleError(`字典转换出错`, error);
    }
  }
};

//复数添加对象里的值对应的label字段
const objAddDictLabelProp = ({ obj, propArr = [], replaceProp = false }) => {
  loop(propArr, (item, index) => {
    let setProp = item.prop;
    if (!replaceProp) {
      setProp = item.prop + "Label";
    }
    obj[setProp] = valChangeToLabel({
      val: obj[item.prop],
      dicListName: item.dicListName,
      labelChangeToVal: item.labelChangeToVal,
      isMultipleString: item.isMultipleString,
      splitSymbol: item.splitSymbol
    });
  });
};

const colRowTableChangeToElementTable = ({
  originData = [],
  excludePropArr = [],
  originDataType = "colArr",
  colNameArr = [],
  colNameProp = "",
  rowNameArrCol = {},
  rowNameArr = [],
  extraRowNameArrCol = [],
  extraRowNameArr = []
} = {}) => {
  let inputData = [];
  if (originDataType == "colArr") {
    loop(originData, (item, index) => {
      colNameArr.push({
        label: item[colNameProp],
        prop: "prop" + index
      });
    });
    if (!rowNameArrCol.prop) {
      //从数据中获取行头部
      loop(originData[0], (item, index) => {
        if (excludePropArr.indexOf(index) == -1) {
          rowNameArr.push({
            label: item,
            prop: index
          });
        }
      });
    }
    loop(rowNameArr, (item, index) => {
      let rowItem = {};
      loop(colNameArr, (item2, index2) => {
        rowItem[item2.prop] = originData[index2][item.prop];
      });
      if (rowNameArrCol.prop) {
        //写死行头部的情况
        rowItem[rowNameArrCol.prop] = rowNameArr[index].label;
      }
      if (extraRowNameArrCol.length > 0) {
        //额外添加行头部//通常是额外说明用
        loop(extraRowNameArrCol, (item_extra, index_extra) => {
          rowItem[item_extra.prop] = extraRowNameArr[index_extra][index].label;
        });
      }
      inputData.push(rowItem);
    });

    if (rowNameArrCol.prop) {
      //行头部写死的情况
      colNameArr.unshift(rowNameArrCol);
    }
    if (extraRowNameArrCol.length > 0) {
      colNameArr = extraRowNameArrCol.concat(colNameArr);
    }
  }

  return {
    colNameArr: colNameArr,
    rowNameArr: rowNameArr,
    inputData: inputData
  };
};

//根据数组某个值进行再分组
const sortClass = (sortData, prop) => {
  const groupBy = (array, f) => {
    let groups = {};
    array.forEach(o => {
      let group = JSON.stringify(f(o));
      groups[group] = groups[group] || [];
      groups[group].push(o);
    });
    return Object.keys(groups).map(group => {
      return groups[group];
    });
  };
  const sorted = groupBy(sortData, item => {
    return prop ? item[prop] : item; // 返回需要分组的对象
  });
  return sorted;
};

//通过配置完成表单自动计算
const computedFormProp = ({ itemCom, form, comByStr = false } = {}) => {
  if (itemCom.computedProp) {
    let result = 0;
    if (comByStr) {
      //字符串模式
      result = "";
    }
    loop(itemCom.formulaArr, (item, index) => {
      if (comByStr) {
        //字符串模式暂时只有相加
        let str =
          item.value || item.value === 0 || item.value === "0"
            ? item.value
            : form[item.prop];
        result += str;
      } else {
        let formProp = form[item.prop];
        if (item.map && item.map.length > 0) {
          let findItem = item.map.find(map_item => {
            return map_item.label == form[item.prop];
          });
          formProp = findItem ? findItem.value : formProp;
        }
        let num =
          item.value || item.value === 0
            ? Number(item.value)
            : Number(formProp);
        if (typeof num == "number" && !isNaN(num)) {
          switch (item.type) {
            case "add":
              result = result + num;
              break;
            case "sub":
              result = result - num;
              break;
            case "multiply":
              result = result * num;
              break;
            case "divide":
              if (num !== 0) {
                result = result / num;
              } else {
                console.warn(`除数不能为0，跳过`);
              }
              break;
            default:
              break;
          }
        }
      }
    });
    form[itemCom.prop] = result;
  }
};

//判断数组是否包含另一个数组//arr1包含arr2
const arrayIsContainedArray = ({ arr1 = [], arr2 = [] }) => {
  if (!(arr1 instanceof Array) || !(arr2 instanceof Array)) return false;
  if (arr1.length < arr2.length) return false;
  var aStr = arr1.toString();
  for (var i = 0, len = arr2.length; i < len; i++) {
    if (aStr.indexOf(arr2[i]) == -1) return false;
  }
  return true;
};

//判断数组是否相等
const judgeArrEqual = ({ arr1 = [], arr2 = [], justContent = true }) => {
  //sort()会影响原始数组,需要拷贝
  if (justContent) {
    return (
      JSON.stringify(arr1.slice(0).sort()) ===
      JSON.stringify(arr2.slice(0).sort())
    );
  } else {
    return JSON.stringify(arr1) === JSON.stringify(arr2);
  }
};

//保留属性的同时清空对象，一般用于表单填写的清空（只清理表层属性）
const clearForm = ({ clearObj }) => {
  if (!clearObj) return console.warn(`清空对象为空`);
  loop(clearObj, (item, index) => {
    if (Array.isArray(item)) {
      clearObj[index] = [];
    } else {
      clearObj[index] = null;
    }
  });
};

//组件根据其他值做一些操作
//默认做显隐操作
const doByOtherVal = ({
  otherVal,
  valArr = [],
  needDoPropArr = [],
  pageInitData,
  ifInclude, //默认显隐操作
  notInclude
} = {}) => {
  loop(needDoPropArr, (item, index) => {
    let findItem = findPropBelongItem({
      obj: pageInitData,
      findPropVal: item
    });
    if (!findItem) return "continue";
    if (valArr.includes(otherVal)) {
      //值为需要隐藏input的值
      if (ifInclude) {
        ifInclude(findItem);
      } else {
        findItem.vif = true;
      }
      ifInclude(findItem);
    } else {
      if (notInclude) {
        notInclude(findItem);
      } else {
        findItem.vif = false;
      }
    }
  });
};

//函数柯里化，含义百度
const curry = fn => {
  return function curriedFn() {
    var _args = Array.prototype.slice.call(arguments);
    if (_args.length < fn.length) {
      return function() {
        var _args2 = Array.prototype.slice.call(arguments);
        return curriedFn.apply(null, _args.concat(_args2));
      };
    }

    return fn.apply(null, _args);
  };
};

//判断数值是否有值
const ifThereValue = fn => {
  // console.warn('校验当前值是不是正确值',fn);

  // 0 是逻辑的 false
  // 1 是逻辑的 true
  // 空字符串是逻辑的 false
  // null 是逻辑的 false
  // NaN 是逻辑的 false（NaN==任何 都是false）

  var ival = parseFloat(fn); //如果变量val是字符类型的数则转换为int类型 如果不是则ival为NaN
  console.warn("fn", fn, ival);
  if (!isNaN(ival)) {
    return true;
  } else {
    return false;
  }
};

/**
 *num 要分隔的数字（必填）
 *n 保留的小数位数（可选）
 *symbol 分隔数字使用的符号（可选，默认为","）
 */
//千分位分隔数字
const splitNumBySymbol = (num, { toFixed, symbol } = {}) => {
  if (!num) {
    console.warn("splitNum需要传入一个待转换的数据");
    return num;
  }
  if (typeof num !== "number") {
    console.warn("num参数应该是一个number类型");
    return num;
  }
  if (toFixed < 0) throw new Error("参数n不应该小于0");
  var hasDot = parseInt(num) != num; //这里检测num是否为小数，true表示小数
  var m = toFixed != undefined && toFixed != null ? toFixed : 1;
  num =
    m == 0
      ? num.toFixed(m) + "."
      : hasDot
      ? toFixed
        ? num.toFixed(toFixed)
        : num
      : num.toFixed(m);
  symbol = symbol || ",";
  num = num.toString().replace(/(\d)(?=(\d{3})+\.)/g, function(match, p1, p2) {
    return p1 + symbol;
  });
  if (toFixed == 0 || (!hasDot && !toFixed)) {
    //如果n为0或者传入的num是整数并且没有指定整数的保留位数，则去掉前面操作中的小数位
    num = num.substring(0, num.indexOf("."));
  }
  return num;
};

//判断是否属于需要包裹的流程，返回对应信息对象
//11.05增加底层使用pageInterface替换avue-form的模式
//因为后端前期问题导致不能全部用key,有部分使用ID的情况,因此做兼容:useKeyCheck
const avueFormSpFlowCheck = (flowKey, {useKeyCheck=false} = {}) => {
  //flowKey,流程表单key
  let avueFormSpFlow = store.state.avueFormSpFlow;
  let usePageInterfaceSpFlow = store.state.usePageInterfaceSpFlow;
  let flowBoxDirectUseComponentSpFlow = store.state.flowBoxDirectUseComponentSpFlow;
  
  //针对传递ID时的处理,进行截取得到KEY
  // 针对出现无flowKey值得情况，进行判定一定要有值，（无值情况：资质申请）
  if(flowKey && flowKey.includes(":")){
    flowKey = flowKey.split(":")[0];
    if(isDev){
      this.$util.showNotify(`该流程传递了流程id而不是key,flowKey:${flowKey}`,{title:"提示",type:"warning"});
    }
  }
  //因为旧的includes判断不好直接改的原因(忘记为什么这么做了),会导致类似beforeContract和beforeContractGathering这种包含关系的会判断错误
  //因此用这个数组来特殊排除一些已经定了,后端又不肯改key的情况
  let notCheckArr = ['beforeContractGathering'];
  if(notCheckArr.includes(flowKey)){//排除掉特定流程名判断
    return {};
  }
  if (flowKey) {
    let findItem = avueFormSpFlow.find(item => {
      let flag = false;
      if (Array.isArray(item.key)) {
        flag = item.key.findIndex(item2 => flowKey===item2) > -1;
      } else {
        flag = flowKey===item.key;
        // flag = useKeyCheck?flowKey===item.key:flowKey.includes(item.key);
      }
      return flag;
    });
    let findItem2 = usePageInterfaceSpFlow.find(item => {
      let flag = false;
      if (Array.isArray(item.key)) {
        flag = item.key.findIndex(item2 => flowKey===item2) > -1;
      } else {
        flag = flowKey===item.key;
        // flag = useKeyCheck?flowKey===item.key:flowKey.includes(item.key);
      }
      return flag;
    });
    let findItem3 = flowBoxDirectUseComponentSpFlow.find(item => {
      let flag = false;
      if (Array.isArray(item.key)) {
        flag = item.key.findIndex(item2 => flowKey===item2) > -1;
      } else {
        flag = flowKey===item.key;
        // flag = useKeyCheck?flowKey===item.key:flowKey.includes(item.key);
      }
      return flag;
    });
    let msg = "";
    let toast = "";
    let type = "success";
    if (findItem) {
      msg = `该流程表单为通用第2版(非最新版本),走avue-form底层：`;
      msg+=`\n流程key： ${flowKey}`;
      msg+=`\n盒子组件名：${findItem.componentName}`;
      toast = msg;

      msg+=`\n自动调用顺序：先调用store中流程指定的avueFlowbox_xxx,再调用pageInterface.`;
      type = "warning";
    } else if (findItem2) {
      msg = `该流程表单为通用第3版(非最新版本),走ljx-pageInterfaceFlowbox底层：`;
      msg+=`\n流程key： ${flowKey}`;
      msg+=`\n盒子组件名：${findItem2.componentName}`;
      toast = msg;

      msg+=`\n自动调用顺序：先调用store中流程指定的pageInterfaceFlowbox_xxx,再走pageInterfaceFlowbox底层调用pageInterface.`;
      type = "warning";
    }else if (findItem3) {
      msg = `该流程表单为通用第4版(最新版本),走ljx-pageInterfaceFlowbox底层：`;
      msg+=`\n流程key： ${flowKey}`;
      msg+=`\n自定义界面名：${findItem3.useComponentName}`;
      toast = msg;

      msg+=`\n自动调用顺序：直接调用pageInterfaceFlowbox底层,再调用store中流程指定的自定义界面,在自定义界面中主动调用pageInterface或者普通页面代码.`;
      type = "success";
    } else {
      msg = `该流程表单为通用第1版(非最新版本),走avue-form底层：`;
      msg+=`\n流程key： ${flowKey}`;
      toast = msg;

      msg+=`\n自动调用顺序:原始AVUE版本,没有包裹盒子,无法特殊处理,要特殊处理只能污染公共代码.`;
      type = "warning";
    }

    if (isDevelopment) {
      //追加重复调用的判断延迟,修改回开发环境全部提示,且改为notify实现,不自动关闭
      repeatCheckUseLastCall({
        repeatCheckTime: 1000,
        setTimeoutFlag: "spFlowCheckTip_"+flowKey,
        callBack: () => {
          // showToast(toast, { type: type, duration:60000, });
          importantLog(msg, "warn");
          closeDevSpFlowCheckTip();
          utilParam.spFlowCheckTip_devNotify = showNotify(toast, {
            title:"提示", 
            type: type, 
            duration:0,
            position:"bottom-right",
            customClass:"spFlowCheckTip_notify",
            dontShowConsole:true,
          });
        },
      });
    }
    return findItem ? findItem : findItem2 ? findItem2 :findItem3 ? findItem3 : {};
  } else {
    return {};
  }
};

const closeDevSpFlowCheckTip = ()=>{
  utilParam.spFlowCheckTip_devNotify && utilParam.spFlowCheckTip_devNotify.close();
  // utilParam.spFlowCheckTip_devNotify = null;//似乎会造成卡顿
};

//页面初始化提示
const pageInitConsoleWarn = ({ that, isMixin = false } = {}) => {
  if (!that) return Message.error("需要传页面this值");
  //flowKey,流程表单key
  console.log(
    (isMixin ? "调用mixin方法-" : "") + that.$options.name + "初始化",
    `路径参数query:`,copy2(that.$route.query),
    `路径参数params:`,copy2(that.$route.params),
  );
};
//判断是否属于需要包裹的流程，返回对应信息对象
const pageInitConsoleWarnComApi = ({ ctx, name = "" } = {}) => {
  console.warn(
    "comApi方法-" + name + "初始化",
    `路径参数query:`,copy2(ctx.root.$route.query),
    `路径参数params:`,copy2(ctx.root.$route.params),
  );
};

//弹窗显示控制通用方法，通过页面中统一定义的popupShow字段，
//目的:用于统一弹窗显隐的控制入口,二可添加提示等统一操作
const changePopupShow = ({ name, show, that = null }) => {
  if (!that) return Message.error("需要传页面this值");
  console.log("弹窗显隐", name, show);
  that.popupShow[name] = show;
};

//对象数组的平铺
const objArrFlat = (objArr = [], { prop = "children" } = {}) => {
  let arr = objArr.reduce((pre, cur) => {
    return cur[prop] ? pre.concat(cur[prop]) : pre.concat(cur);
  }, []);
  arr = arr.concat(objArr);
  return arr;
};

//函数重复调用缓冲函数
const repeatCheckUseLastCall = ({
  isWatchUse = false,
  chargeWatchDataByStringObj = false,
  watch_val = null,
  watch_oldVal = null,
  callBack = () => {},
  repeatCheckTime = 300,
  setTimeoutFlag = "" //在同一段时间内必须独一无二,否则影响判断
} = {}) => {
  if (!setTimeoutFlag) return Message.error("需要传setTimeoutFlag");
  if (utilParam[setTimeoutFlag]) {
    //isDev && console.log(`${setTimeoutFlag}-重复调用检查时间-距离上次未超出${repeatCheckTime}ms，取消上一次调用`);
    clearTimeout(utilParam[setTimeoutFlag]);
  }
  if (
    isWatchUse &&
    typeof watch_val === "object" &&
    watch_val !== watch_oldVal
  ) {
    //当监听模式中，监听的是对象值，且为变量地址变化时，直接运行，不延迟
    callBack();
  } else {
    utilParam[setTimeoutFlag] = setTimeout(() => {
      // isDev &&
      //   console.log(
      //     `${setTimeoutFlag}-重复调用检查时间-距离上次已过${repeatCheckTime}ms，执行调用`
      //   );
      callBack();
    }, repeatCheckTime);
  }
};

//元素自动宽度计算,一般是用来计算单行文字的自动宽度,或表格单列的最大宽度
//多行文字的自动宽度没有意义,因为可以换行
const getEleSize = ({ refEle = null, className = "", id = "" } = {}) => {
  let ele = refEle
    ? refEle
    : id
    ? document.querySelector("#" + id)
    : className
    ? document.querySelector("." + className)
      ? document.querySelector("." + className)[0]
      : ""
    : "";
  if (ele) {
    return {
      width: ele.offsetWidth,
      height: ele.offsetHeight
    };
  } else {
    consoleError(`获取不到元素`);
    return false;
  }
};

//获取相同class下元素的最大宽度
const findSameClassMaxWidth = ({ className = "" } = {}) => {
  let arr;
  arr = [...document.querySelectorAll("." + className)].map(
    item => item.offsetWidth
  );
  if (arr.length > 0) {
    sortArr({ arr: arr, order: "desc" });
    console.log(
      "根据内容,自动计算宽度findSameClassMaxWidth",
      className,
      arr[0]
    );
    return arr[0];
  } else {
    consoleError(`获取不到元素`);
    return false;
  }
};
//获取当前月份到之前12个月的数组
const getMonthList = ({ format = "yyyy-MM" } = {}) => {
  let d = new Date();
  d.setMonth(d.getMonth() + 1); //先加一获取到当前月份
  let result = [];
  for (let i = 0; i < 12; i++) {
    d.setMonth(d.getMonth() - 1);
    //在这里可以自定义输出的日期格式
    result.push(d.Format(format));
  }
  return result;
};
//获取指定日期和时分秒的语法糖,不设置参数以最新为准
const getNewDateTimeString = ({
  year = new Date().getFullYear(),
  month = new Date().getMonth() + 1,
  day = new Date().getDate(),
  hours = new Date().getHours(),
  minutes = new Date().getMinutes(),
  seconds = new Date().getSeconds(),
  valueType = "string"
} = {}) => {
  let date = new Date(year, month - 1, day, hours, minutes, seconds);
  if (valueType === "string") {
    date = date.Format("yyyy-MM-dd HH:mm:ss");
  } else if (valueType === "date") {
  } else if (valueType === "milliseconds") {
    date = date.getTime();
  }
  return date;
};

const consoleError = (str, obj1, obj2, {} = {}) => {
  console.error(str, obj1, obj2);
  if (isDevelopment) {
    showToast(`报错了,看控制台,` + str, { type: "error" });
  }
};

//跳转指定元素位置
const pageScrollToEle = ({ refEle = null, className = "", id = "" ,block,inline,behavior,alignTop} = {}) => {
  let ele = refEle
    ? refEle
    : id
    ? document.querySelector("#" + id)
    : className
    ? document.querySelector("." + className)
      ? document.querySelector("." + className)
      : ""
    : "";
  if (ele) {
    ele?.scrollIntoView({
      block:block,//"start", "center", "end", 或 "nearest"之一,"nearest"代表以最小移动方式滚动
      inline:inline,
      behavior:behavior,
      alignTop:alignTop,
    });
  } else {
    showToast(`找不到元素`, { type: "warning" });
  }
};

//判断值是否存在,主要是为了兼容数组的空长度和数字类型的0
const judgeValNotEmpty = val => {
  let set_flag = true;
  if (Array.isArray(val)) {
    if (val.length > 0) {
      set_flag = true;
    } else {
      set_flag = false;
    }
  } else if (typeof val === "number") {
    /* if(val === 0){
      set_flag = false;
    } else {
      set_flag = true;
    } */
    //1.修改逻辑,只要是数字都不为空
    set_flag = true;
  } else if (!val) {
    set_flag = false;
  }
  return set_flag;
};

//根据第三方库AsyncValidator来对对象进行验证,element和antDesign使用的库
const checkObjByAsyncValidator = ({
  rulesObj = null,
  formData = null,
  showMessage = true
}) => {
  if (!rulesObj) {
    return showToast(`rulesObj不可为空`, { type: "error" });
  }
  if (!formData) {
    return showToast(`formData不可为空`, { type: "error" });
  }

  //针对需要保存服务器的情况做一层转化
  loop(rulesObj, (rules, index) => {
    if (rules && rules.length > 0) {
      loop(rules, (item, index) => {
        if (item.pattern && typeof item.pattern == "string") {
          // "pattern": "/^(?!https:\/\/).*/",检测失败
          // "pattern":"^(?!(http|https):\/\/).*",成功检测
          // 似乎正则表达式为字符串时头尾带上/会导致正则表达式失效
          if (item.pattern.startsWith("/") && item.pattern.endsWith("/")) {
            item.pattern = item.pattern.substring(1, item.pattern.length - 1);
            console.log("转换后的正则配置",item.pattern);
          }
          item.pattern = new RegExp(item.pattern);
        } else if (item.validatorFuncKey) {
          item.validator = rulesFunc[item.validatorFuncKey];
        }
      });
    }
  });
  //转化完成

  let validateDisabled = false;

  let validateState = "validating";

  const descriptor = rulesObj;
  //去除开发警告,在node_modules中的依赖库代码修改
  const validator = new AsyncValidator(descriptor);
  
  const model = formData;
  let flag = null;
  validator.validate(model, { firstFields: true,suppressWarning:true }, (errors, invalidFields) => {
    let validateState = !errors ? "success" : "error";
    let validateMessage = errors ? errors[0].message : "";

    if (validateState === "error") {
      if (showMessage) {
        showToast(validateMessage, { type: "error" });
      }
      flag = false;
    } else {
      flag = true;
    }
  });
  return flag;
};
//返回一个带%号的数字,空时传回空字符串
const changeNumToPercent = val => {
  return judgeValNotEmpty(val) ? val + "%" : "";
};

//小数转换为百分比数字,空时传回空字符串,默认保留百分比之后2位小数
const changeLittleNumToPercent = (val, { num = 2 } = {}) => {
  let a = Number(val);
  if (Number.isNaN(a)) {
    if (isDev) {
      console.warn(`“${val}”不可转换为数字`);
    }
    return "";
  } else {
    let numFix = (a * 100).toFixed(num) + "%";
    //其他操作
    return numFix;
  }
};

//确认弹窗同步等待通用函数
//$confirm在element中和messageBox用的是同一个文档
const confirmAwait = ({
  tip = "确定吗",
  dialogTitle = "提示",
  confirmButtonText = "确定",
  cancelButtonText = "取消",
  type = "warning"
} = {}) => {
  return new Promise(resolve => {
    if(isMobileBrowser()){
      Dialog.confirm({
        title: dialogTitle,
        message: tip,
        confirmButtonText: confirmButtonText,
        cancelButtonText: cancelButtonText,
        theme:"round-button",
        confirmButtonColor:"#2E6DB2",
        cancelButtonColor:"#2eb257",
      })
      .then(() => {
        resolve(true); // resolve()中根据实际情况需要来写
      })
      .catch(() => {
        resolve(false);
      });
    }
    else{
      MessageBox.confirm(tip, dialogTitle, {
        type: type,
        confirmButtonText: confirmButtonText,
        cancelButtonText: cancelButtonText
      })
        .then(() => {
          resolve(true); // resolve()中根据实际情况需要来写
        })
        .catch(() => {
          resolve(false);
        });
    }
    
  });
};

//弹窗同步等待通用函数
//$prompt在element中和messageBox用的是同一个文档
const promptAwait = ({
  tip = "确定吗",
  dialogTitle = "提示",
  confirmButtonText = "确定",
  inputPattern = null,//验证正则表达式
  inputErrorMessage = "请检查",
  type = ""
} = {}) => {
  return new Promise(resolve => {
    MessageBox.prompt(tip, dialogTitle, {
      type: type,
      confirmButtonText: confirmButtonText,
      cancelButtonText: cancelButtonText,
      inputPattern:inputPattern,
      inputErrorMessage:inputErrorMessage,
    })
      .then(({value}) => {
        resolve(true,value); // resolve()中根据实际情况需要来写
      })
      .catch(() => {
        resolve(false);
      });
  });
};

//弹窗同步等待通用函数
//$alert在element中和messageBox用的是同一个文档
const alertAwait = ({
  tip = "确定吗",
  dialogTitle = "提示",
  confirmButtonText = "确定",
  type = ""
} = {}) => {
  return new Promise(resolve => {
    MessageBox.alert(tip, dialogTitle, {
      type: type,
      confirmButtonText: confirmButtonText,
    })
      .then(() => {
        resolve(true); // resolve()中根据实际情况需要来写
      })
  });
};

//定时器循环
// 是否可用定时器取代循环的两个决定性因素：
// （1）此处理过程不需要同步处理
// （2）数据不需要按顺序处理
const loopBySetTimeout = (
  arr,
  fn,
  { onComplete = () => {}, time = 25 } = {}
) => {
  let todo = arr.concat();
  setTimeout(function() {
    fn(todo.shift(),todo);
    if (todo.length > 0) {
      setTimeout(loopBySetTimeout(todo,fn,{ onComplete:onComplete,time:time}), time);
    } else {
      onComplete(arr);
    }
  }, time);
};

//获取浏览器参数
const getUrlParameter = (
  url,
  {} = {}
) => {
  if ( typeof window === 'undefined' ) {
    return '';
  }
  url = url.replace( /[[]/g, '\\[' ).replace( /[\]]/g, '\\]' );
  const regex = new RegExp( '[\\?&]' + name + '=([^&#]*)' );
  const results = regex.exec( window.location.search );
  return results === null ? '' : decodeURIComponent( results[ 1 ].replace( /\+/g, ' ' ) );
};

//找到数组里的极限值
const findMaxOrMinItem = ({
  arr=[],
  prop="",
  findType="max",
}={})=>{
  // var arr = [9,8,55,66,49,68,109,55,33,6,2,1];  
  // var max = arr[0];
  // for(var i = 1; i < arr.length; i++){
  //   if( max < arr[i] ){
  //     max = arr[i];
  //   }
  // }
  if(prop){
    arr = arr.map(item=>item[prop]);
  }
  
  return Math[findType].apply(null,arr);
};

//找到数组里的极限值对象,可排序非数字,如字符串日期
const findMaxOrMinItemForAnyType = ({
  arr=[],
  prop="",
  findType="max",
}={})=>{
  if(arr.length===0)return null;
  if(arr.length===1)return arr[0];
  arr = arr.map(item=>item);
  arr.sort(sortBy(prop,findType==="max"?'desc':'asc'));
  return arr[0];
};

//JSON.parse优化版,可以兼容转换无双引号,以及\n换行符等而不会报错
//有个问题,会把true false转换为"true","false"//已解决该问题
const jsonParsePro = (str)=>{
  if(!str)return null;
  let format = str
        .replace(/(['"])?(\d{4})-(\d{1,2})-(\d{1,2})?\s*,/g, '"$2-$3-$4",')
        // 通过@colon@替换“:”，防止日期格式报错
        .replace(/(['"])?(\d{4})-(\d{1,2})-(\d{1,2})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})(['"])?\s*,/g, '"$2-$3-$4 $5@colon@$6@colon@$7",')
        .replace(/(['"])?([a-z0-9A-Z\u4e00-\u9fa5_]+)(['"])?\s*:/g, '"$2": ')
        .replace(/:\s*(['"])?([a-z0-9A-Z\u4e00-\u9fa5_]+)?!(true,)|(false,)(['"])?\s*,/g, ': "$2",')
        .replace(/@colon@/g, ":")
        .replace(/:\s*,/g, `:"",`)
        .replace(/:\s*,\s*}/g, `:""}`)
        .replace(/:\s*,\s"/g, `:"","`)
        .replace(/:\s*,\s'/g, `:"",'`)
        .replace(/,\s*}/g, "}");
  let obj = JSON.parse(format);
  console.log("转换结果",obj);
  return obj;
}

//数组两两对比通用函数
const arrCompare = ({arr=[],func=()=>{}}={})=>{
  for(let i = 0;i<arr.length;i++){
    if(!arr[i+1])break;
    let isBreak = func(arr[i],arr[i+1],index);
    if (isBreak == "break") {
      break;
    } else if (isBreak == "continue") {
      continue;
    }
  };
};

//解决精度问题的加减乘除通用方法
const computedCommon = ({
  numA,
  numB, 
  type,
  toFixed=2,
})=>{
  let a = numA;
  let b = numB;
  let op = type;
  let n = toFixed;
  // 加减乘除的四个方法
  // function publicAdd(a, b) {
  //   return computedCommon(a, b, 'add')
  // }
  function publicIsInteger(obj) {
    return Math.floor(obj) === obj
  }
  function publicToInteger(floatNum) {
    var ret = { times: 1, num: 0 };
    if (publicIsInteger(floatNum)) {
      ret.num = floatNum;
      return ret
    }
    var strfi = floatNum + '';
    var dotPos = strfi.indexOf('.');
    var len = strfi.substr(dotPos + 1).length;
    var times = Math.pow(10, len);
    var intNum = parseInt(floatNum * times + 0.5, 10);
    ret.times = times;
    ret.num = intNum;
    return ret
  }
  var o1 = publicToInteger(a);
  var o2 = publicToInteger(b);
  var n1 = o1.num;
  var n2 = o2.num;
  var t1 = o1.times;
  var t2 = o2.times;
  var max = t1 > t2 ? t1 : t2;
  var result = null;
  switch (op) {
    case 'add':
      if (t1 === t2) { // 两个小数位数相同
        result = n1 + n2
      } else if (t1 > t2) { // o1 小数位 大于 o2
        result = n1 + n2 * (t1 / t2)
      } else { // o1 小数位 小于 o2
        result = n1 * (t2 / t1) + n2
      }
      return result / max;
    case 'subtract':
      if (t1 === t2) {
        result = n1 - n2
      } else if (t1 > t2) {
        result = n1 - n2 * (t1 / t2)
      } else {
        result = n1 * (t2 / t1) - n2
      }
      return result / max;
    case 'multiply':
      result = (n1 * n2) / (t1 * t2);
      return toFixed(result, n)
      return result;
    case 'divide':
      result = (n1 / n2) * (t2 / t1);
      // 如果除数为0，返回/,防止出错
      if (b == 0) {
        return '/'
      } else {
        return toFixed(result, n)
      }
  }
};

//整合一下,获取refForm的通用兼容方法
const getRefFormCommon = ({thatVm,key})=>{
  let componentName = avueFormSpFlowCheck(key)?.componentName;
  let ref_form = componentName?
    (
      componentName === "pageInterfaceFlowBox"?
      thatVm.$refs.formBox
      :thatVm.$refs.formBox.$refs.form
    )
    :thatVm.$refs.form;

  return ref_form;
};

//通过字符串获取一个多层级对象的深层属性或者设置值
const getObjDeepProp = ({obj,propStr})=>{
  /* let returnVal;
  if(propStr.indexOf(".") > -1) {//更多层级的暂时不考虑,因为也没有
    propStr = propStr.split(".");
    returnVal = obj;
    loop(propStr,(item,index)=>{
      returnVal = returnVal?.[item];
    });
  }
  else{
    returnVal = obj[propStr];
  }
  return returnVal; */
  let tempObj = obj;
  propStr = propStr.replace(/\[(\w+)\]/g, '.$1');
  propStr = propStr.replace(/^\./, '');

  let keyArr = propStr.split('.');
  let i = 0;
  for (let len = keyArr.length; i < len - 1; ++i) {
    if (!tempObj && !strict) break;
    let key = keyArr[i];
    if (key in tempObj) {
      tempObj = tempObj[key];
    } else {
      /* if (strict) {
        throw new Error('please transfer a valid prop path to form item!');
      } */
      break;
    }
  }
  return {
    belongObj: tempObj,
    key: keyArr[i],
    value: tempObj ? tempObj[keyArr[i]] : null
  };
};

//通过字符串设置一个多层级对象的深层属性
const setObjDeepProp = ({obj,propStr,setValue,setDataWatch=false,that=null})=>{
  let tempObj;
  if(propStr.indexOf(".") > -1) {//更多层级的暂时不考虑,因为也没有
    /* propStr = propStr.split(".");
    tempObj = obj;
    loop(propStr,(item,index)=>{
      if((index === propStr.length - 1) && tempObj){
        if(setDataWatch){
          that?.$set(tempObj, item, setValue);
        }
        else{
          tempObj[item] = setValue;
        }
      }
      else{
        tempObj = tempObj?.[item];
      }
    }); */
    let findDirectBelongObj = getObjDeepProp({obj:obj,propStr:propStr});
    let findPropBelongObj = findDirectBelongObj.belongObj;
    let findPropKey = findDirectBelongObj.key;
    if(setDataWatch){
      that?.$set(findPropBelongObj, findPropKey, setValue);
    }
    else{
      findPropBelongObj[findPropKey] = setValue;
    }
  }
  else{
    if(setDataWatch){
      that?.$set(obj, propStr, setValue);
    }
    else{
      obj[propStr] = setValue;
    }
  }
};

//函数说明:添加前导零，给数字补位0
const toFixedInFront = ({num=0,cover=2}={})=>{
  return String("0".repeat(cover) + num).slice(-cover);
};

//函数说明: 设置pageInterface表单对象中属性的通用入口方法,主要用途和store中的mutations一样,为了给表单赋值数据一个通用入口
//目的是这样之后可以统一在这里添加打印说明,以及自动判断是否需要调用$set
//对于如何在vue2中判断对象某一个属性是否是响应式属性:暂时没有找到方法,
//先用判断是否存在或者判断是否等于undefined的方式来判断是否响应式来决定是否要调用$set
const setPageInterfaceData = ({
  formInputData="",
  prop="",
  value=null,
}={})=>{
  
  if(formInputData[prop] === undefined){
    console.log("主动设置数据对象属性-pageInterface","该属性目前为undefined,因此通过$set设置",prop,value);
    Vue.set(formInputData,prop,value);
  }
  else{
    console.log("主动设置数据对象属性-pageInterface",prop,value);
    formInputData[prop] = value;
  }
};

//设置元素可拖动
const setEleDraggable = ({ 
  refEle = null, 
  className = "", 
  id = "",
  dragInfoObj = {},//必须传入响应式对象
} = {}) => {
  let ele = refEle
    ? refEle
    : id
    ? document.querySelector("#" + id)
    : className
    ? document.querySelector("." + className)
      ? document.querySelector("." + className)
      : ""
    : "";
  if (ele) {
    ele.onmousedown = function (e) {
      // 获取鼠标在元素上的位置（鼠标按下时在元素上得位置）
      //不用e.offsetX的原因:offsetX如果在点击到元素内部子元素的情况下得到的不是期望值
      // let mouseDownX = e.offsetX;
      // let mouseDownY = e.offsetY;
      let mouseDownX = e.clientX - ele.offsetLeft;
      let mouseDownY = e.clientY - ele.offsetTop;
      document.onmousemove = function (e) {
        // let eleWidth = ele.offsetWidth;
        // let eleHeight = ele.offsetHeight;
        let left = e.clientX - mouseDownX;
        let top = e.clientY - mouseDownY;
        ele.style.left = `${left}px`;
        ele.style.top = `${top}px`;
        // dragInfoObj.x = x;
        // dragInfoObj.y = y;
      };
      document.onmouseup = function (e) {
        document.onmousemove = null;
        document.onmouseup = null;
      };
    };
    
  } else {
    showToast(`找不到元素`, { type: "warning" });
  }
};

//函数说明//用于异步async函数中等待指定时间
const waitTime = (ms)=>{
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

//函数说明//用于保存用户操作轨迹埋点
const userTrackSave = (eventName,extraTrackData={})=>{
  if (!eventName) {
    console.error('Track slsWebLogger 事件名无效')
    return
  }
  let commonTrackData = {
    eventName:eventName,
    userId:store.state.user.userInfo.userId,
    userName:store.state.user.userInfo.userName,
    loginName:store.state.user.userInfo.loginName,
    cityId:store.state.getCityApiObj.cityId,
    areaId:store.state.getCityApiObj.areaId,
  }
  const submitData = Object.assign({}, commonTrackData, {data: extraTrackData})
  // 上报
  //暂无接口,改为保存本地
  store.state.userTrackList.push(submitData);
  // sessionStorage.setItem(sessionStorage_key, JSON.stringify(submitData));
  // slsWebLogger.send(submitData)
  if (isDev) {
    console.log('userTrackList', copy2(store.state.userTrackList))
  }
};

//配置判断的公用方法,两种方式:1.使用ascncValidator库 2.自定义的一套配置验证,通常使用第一种方式
const judgeByOtherValueCommonMethod = ({
  judgeByOtherValueConfig,
  formInputData,
})=>{
  let judgeArr = judgeByOtherValueConfig.judgeArr;
  let checkConfig =
    judgeByOtherValueConfig.checkObjByAsyncValidator;
  let showMessage = judgeByOtherValueConfig.showMessage;
  /* let formInputData =
    judgeByOtherValueConfig.groupItemUseParentFormInputData
      ? this.formInputDataParentForGroupItem
      : this.formInputData; */
  let returnFlag = undefined;

  //使用ascncValidator库进行验证
  if (checkConfig) {
    returnFlag = checkObjByAsyncValidator({
      rulesObj: checkConfig,
      formData: formInputData,
      showMessage: showMessage === true ? showMessage : false,
    });
    if (judgeByOtherValueConfig.oppositeFlag === true) {
      returnFlag = !returnFlag;
    }
  }
  //使用默认验证
  else {
    let func = (obj) => {
      if (formInputData && !isObjectEmpty(formInputData)) {
        let set_flag = false;
        let otherPropVal = formInputData[obj.prop];
        if (Array.isArray(obj.judgeVal)) {
          loop(obj.judgeVal, (item, index) => {
            let label = "";
            if (obj.dicListName) {
              label = valChangeToLabel({
                val: item,
                dicListName: obj.dicListName,
              });
            }
            let flag;
            if (obj.valueType == "array" && otherPropVal) {
              //数组模式的判断，适用于多选框，多选下拉框
              if (obj.judgeMethod == "includes") {
                flag = otherPropVal.includes(item);
              } else if (obj.judgeMethod == "contained") {
                flag = arrayIsContainedArray({
                  arr1: otherPropVal,
                  arr2: item,
                });
              } else {
                flag = judgeArrEqual({
                  arr1: otherPropVal,
                  arr2: item,
                  justContent: true,
                });
              }
            } else {
              flag =
                item === otherPropVal ||
                (label !== "" && label === otherPropVal); //兼容文本相同的情况
            }

            set_flag = flag;
            if (flag) {
              return "break";
            }
            if (!flag) {
            }
          });
        } else if (obj.judgeValOnType === "notEmpty") {
          set_flag = judgeValNotEmpty(otherPropVal);
        } else if (obj.judgeValOnType === "empty") {
          set_flag = !judgeValNotEmpty(otherPropVal);
        } else if (this.isDev) {
          showToast(
            `judgeByOtherValueConfig的judgeArr格式不对,judgeVal必须为数组,或者judgeValNotEmpty不存在`,
            { type: "error" }
          );
        }
        return set_flag;
      }
    };
    if (Array.isArray(judgeArr)) {
      let flag_arr = [];
      loop(judgeArr, (item, index) => {
        let flag;
        if (Array.isArray(item)) {
          //数组中的数组默认为&&判断，有或判断写到第一层
          let flag_arr2 = [];
          loop(item, (item2, index2) => {
            let flag_item2 = func(item2);
            flag_arr2.push(flag_item2);
          });
          flag = !flag_arr2.includes(false);
          flag_arr.push(flag);
        } else {
          flag = func(item);
          flag_arr.push(flag);
        }
      });
      if (judgeByOtherValueConfig.judgeType == "&&") {
        returnFlag = !flag_arr.includes(false);
      } else {
        //默认为或判断
        returnFlag = flag_arr.includes(true);
      }
    } else if (this.isDev) {
      showToast(`judgeByOtherValueConfig的judgeArr必须为数组`, {
        type: "error",
      });
    }
  }
  return returnFlag;
};

//返回两个日期相差的月数
const datesDiffMonth = (startDate, endDate)=>{
  //用-分成数组
  startDate = startDate
    .toLocaleDateString()
    .replace(/(年|月)/g, "/")
    .replace("日", "")
    .replace(/[^\d-/]/g, "")
    .split("/");
  endDate = endDate
    .toLocaleDateString()
    .replace(/(年|月)/g, "/")
    .replace("日", "")
    .replace(/[^\d-/]/g, "")
    .split("/");
  //通过年,月差计算月份差
  return (startDate[0] - endDate[0]) * 12 + (startDate[1] - endDate[1]) + 1;
};

//表格自动计算通用格式
const computedByOtherValueOnTable = ({
  changeProp="",
  watchProps=["tempA","tempB"],
  resultProp="",
  changeRow,
  that,
  dontSetVal,
  useNextTick,
  allWatchPropMustHaveValue,
  computedFunc,
})=>{
  if (watchProps.includes(changeProp)) {
    if(
        allWatchPropMustHaveValue
        && watchProps.findIndex(item=>{
          return changeRow[item] === undefined || changeRow[item] === null
        }) > -1
      ){
      return;
    }
    if(useNextTick){
      that.$nextTick(()=>{
        let comVal = computedFunc();
        dontSetVal !== true && comVal !== changeRow[resultProp] 
        && that.$set(changeRow, resultProp, comVal);
      });
    }
    else{
      let comVal = computedFunc();
      dontSetVal !== true && comVal !== changeRow[resultProp] 
      && that.$set(changeRow, resultProp, comVal);
    }
  }
};

//批量处理指定属性的JSON.parse
const batchJsonParse = ({
  obj,
  changeProps=[],
  changePropFailRes=null,
  useJsonParsePro,//使用优化后的方法进行解析,可以兼容转换无双引号,以及\n换行符等而不会报错
})=>{
  if(!obj){return console.warn(`需要处理的对象不存在`,obj)}
  let innerFunc = (handleObj)=>{
    loop(changeProps,(item,index)=>{
      if(handleObj[item] && typeof handleObj[item] === "string"){
        if(useJsonParsePro){
          handleObj[item] = jsonParsePro(handleObj[item]);
        }
        else{
          handleObj[item] = JSON.parse(handleObj[item]);
        }
      }
      else{
        handleObj[item] = changePropFailRes;
      }
    });
  }
  if(Array.isArray(obj)){
    loop(obj,(obj_item)=>{
      innerFunc(obj_item);
    });
  }
  else{
    innerFunc(obj);
  }
};

//判断是否处于手机浏览器环境
const isMobileBrowser = ()=>{
  let flag = navigator.userAgent.match(/(phone|pad|pod|iPhone|iPod|ios|iPad|Android|Mobile|BlackBerry|IEMobile|MQQBrowser|JUC|Fennec|wOSBrowser|BrowserNG|WebOS|Symbian|Windows Phone)/i)
  // match的返回值：如果匹配不到，返回null; 否则返回匹配到的 array
  flag = flag?true:false;
  if(store?.state.useOnMobile === true){
    flag = true;
  }
  return flag;
}

export default {
  apiHttp,
  addTimeObjOrTimeDesc,
  sortBy,
  sortArr,
  routerPush,
  routerPushPro,
  getRouterParams,
  beforeImgUpload,
  beforeFileUpload,
  checkFlash,
  getUrlParams,
  getUrlParamTwo,
  loop,
  copy,
  copy2,
  isObjectEmpty,
  isObjectEmptyOrUndefined,
  setStorageWithTime,
  getStorageWithTime,
  setSessionId,
  getSessionId,
  removeSessionId,
  checkPhone,
  importantLog,
  numToChinese,
  randomNum,
  myIsNaN,
  showToast,
  getSecToFormat,
  getPresentTime,
  listenKeyInput,
  makeEvent,
  closeActiveTag,
  changeInterState,
  judgeFlowState,
  getTimeDayBeginOrEnd,
  getMonthDayEnd,
  showLoading,
  showLoadingClose,
  checkData,
  TSGeneral,
  echoData,
  getJsonDataByForm,
  getParentsData,
  getComFlowState,
  getSendBackState,
  getParameterNamesAndBody,
  deepEqual,
  checkRuleIfCustom,
  exportExcel,
  loopDeep,
  getAllDictListFormat,
  getUserBelongCityId,
  parseHtml,
  desensitizationMethod,
  findPropBelongItem,
  formCheck,
  formCheckSpecial,
  deleteInputRuleFail,
  deleteInputStringNul,
  viewFile,
  downloadFile,
  exportFileDownload,
  dictionaryChange,
  ChineseDictionaryChange,
  interceptedFilename,
  diffPropVal,
  valChangeToLabel,
  objAddDictLabelProp,
  colRowTableChangeToElementTable,
  sortClass,
  computedFormProp,
  arrayIsContainedArray,
  judgeArrEqual,
  clearForm,
  doByOtherVal,
  curry,
  ifThereValue,
  splitNumBySymbol,
  avueFormSpFlowCheck,
  pageInitConsoleWarn,
  pageInitConsoleWarnComApi,
  changePopupShow,
  objArrFlat,
  repeatCheckUseLastCall,
  getEleSize,
  findSameClassMaxWidth,
  getMonthList,
  getNewDateTimeString,
  pageScrollToEle,
  judgeValNotEmpty,
  checkObjByAsyncValidator,
  changeNumToPercent,
  changeLittleNumToPercent,
  confirmAwait,
  loopBySetTimeout,
  getUrlParameter,
  findMaxOrMinItem,
  findMaxOrMinItemForAnyType,
  jsonParsePro,
  arrCompare,
  computedCommon,
  getRefFormCommon,
  getObjDeepProp,
  setObjDeepProp,
  showNotify,
  closeDevSpFlowCheckTip,
  promptAwait,
  alertAwait,
  toFixedInFront,
  setPageInterfaceData,
  setEleDraggable,
  waitTime,
  userTrackSave,
  judgeByOtherValueCommonMethod,
  datesDiffMonth,
  computedByOtherValueOnTable,
  batchJsonParse,
  isMobileBrowser,
  deleteFile,
};
