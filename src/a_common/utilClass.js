import Vue from "vue";
import axios from 'axios'
import store from "@/store";
import router from "@/router";
import { Message, Loading, MessageBox, Notification} from "element-ui";
import request from "@/utils/request";
import global from "@/a_common/globalFunc";
import util from "@/a_common/util";
import AsyncValidator from "async-validator";
import rulesFunc from "@/a_common/rulesFunc";

const utilParam = {
  loadingCount: 0
}; //用于本文件公用函数中重复读取判定等逻辑需要的参数存放
let isDevelopment = process.env.NODE_ENV === "development";
let isDev = process.env.NODE_ENV === "development";

/* 测试类 */
class testClass {
  constructor(x, y) {
    this.testParam1 = x;
    this.y = y;
  }
  get testParam1() {
    console.log("读取testParam1");
    return testParam1+'getter';
  }
  set testParam1(value) {
    console.log("设置testParam1");
    console.log('setter: '+value);
    if(value === "2234"){
      this.testParam1 = value;
    }
    else{
      console.log("不符合,不设置");
    }
  }
  toString() {
    return '(' + this.testParam1 + ', ' + this.y + ')';
  }
}

export default {
  testClass,
};
