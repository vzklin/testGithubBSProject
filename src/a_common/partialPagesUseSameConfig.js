import store from "@/store";
import util from "@/a_common/util";

const utilParam = {}; //用于本文件公用函数中重复读取判定等逻辑需要的参数存放
//部分页面共用的配置(如预评估和合同和收入计划的收入表格配置)
const getConfig = ({
  name,
  that,
  useBy, //根据该字段去做一些特异性区分
  taskKey, //根据taskKey做一些配置不好完成的功能
  otherParams={}, //其他一些特殊处理用的参数存放
}) => {
  if (!that) {
    return util.showToast(`this对象未传递!`, { type: "error" });
  }
  if (!name) {
    return util.showToast(`name未传递!`, { type: "error" });
  }
  let config;
  console.log("调用配置:", name, "useBy:", useBy);
  let params = { that: that, useBy: useBy , taskKey: taskKey, otherParams:otherParams};//重新集合参数
  switch (name) {
    case "收入计划相关表格":
      //顺便获取账目项关系,转换为字典
      getSubjectItemListAndSetDict();
      config = incomePlanTable(params);
      break;
    case "收款计划相关表格":
      config = collectPlanTable(params);
      break;
    case "支出计划相关表格":
      config = expenditurePlanTable(params);
      break;
    case "成本计划相关表格":
      getSubjectItemListAndSetDictCT();
      config = costPlanTable(params);
      break;
    default:
      break;
  }
  return config;
};

/* 收入计划表格 */
const incomePlanTable = ({ name = "", that, useBy, otherParams } = {}) => {
  let fieldMap = _fieldMap["新前向合同"];
  let planFormUse = ["收入计划变更-变更后计划"].includes(useBy);
  let planFormUseJustShow = [
    "收入计划与进度_项目全景视图",
    "收入计划变更-原收入计划"
  ].includes(useBy);
  //不同地方使用,不同的尾列
  let dynamicCols = planFormUseJustShow
    ? [
        {
          label: "出账状态",
          prop: "outGoingStatus",
          component_type: "show",
          options: {
            dicListName: "OUTGOING_STATUS"

          }
        },
        {
          label: "已出账金额（元）",
          prop: "outGoingMoney"
        }
      ]
    : planFormUse
    ? [
        {
          label: "出账状态",
          prop: "outGoingStatus",
          component_type: "show",
          options: {
            dicListName: "OUTGOING_STATUS"
          }
        },
        {
          label: "已出账金额（元）",
          prop: "outGoingMoney"
        },
        { label: "操作", isOpera: true, deleteBtnShow: true }
      ]
    : [{ label: "操作", isOpera: true }];
  //设置初验时间的限制,只有变更表单需要
  let setClientFirstCheckDate = colIndex => {
    return planFormUse
      ? {
          setConfigByOtherValue: {
            watchUseImmediate: true,
            setConfig: {
              prop: `colNameArr.${colIndex}.startTime`,
              value: ({ formInputData }) => {
                return formInputData["clientFirstCheckDate"];
              }
            },
            checkObjByAsyncValidator: {
              clientFirstCheckDate: [
                {
                  validator: (rule, value, callback) => {
                    if (value) {
                      callback();
                    } else {
                      callback(new Error("clientFirstCheckDate不存在值"));
                    }
                  } ////使用验证函数,可用于通用规则不满足使用时
                }
              ]
            }
          }
        }
      : {};
  };
  let config = {
    itBlock: [
      {
        label:
          planFormUse || planFormUseJustShow
            ? "IT类：可甩单至销售中心的收入计划，包括IT类、云产品、物联网产品"
            : "IT类：",
        component_type: "wordBlock",
        style: {
          "white-space": "pre-wrap",
          "font-size": "14px",
          color: "red"
        }
      },
      {
        vif: planFormUseJustShow ? false : true,
        component_type: "buttonAddArrayRow",
        buttonLabel: "新增一次性账目项",
        propTarget: fieldMap["IT类一次性账目项"],
        buttonType: "primary",
        newRowDefVal: [], //新增默认行填写的数据
        maxlength:20,//最大行数
        elColStyle: "width:auto;margin-top:20px;", //固定按钮盒子宽度
        // showReqStar:true,
        span: 8
      },
      {
        component_type: "table",
        describe: "新增一次性账目项",
        prop: fieldMap["IT类一次性账目项"],
        // inputMustFill: true,
        blockStyle: "width:initial;margin-left:0;",
        elColStyle: "margin-top:10px;",
        deleteBtnShow: true,
        span: 24,
        colMinWidth: "200px",
        tipInline: true,
        tableInputPlaceholderUseDef: true,
        ...setClientFirstCheckDate(6),
        watchDataChange: {
          //监听数据变化配置//禁止在监听函数中修改该组件本身的值,如一定有,需加上判断限制,防止无限循环
          type: "rowInputValueChange", //目前两种1.inputValueChange:输入数据变化时2.actualValueChange:内部组件实际数据变化时3.(仅表格组件,且回调参数不同)rowInputValueChange:表格行数据变化时
          func: ({
            value,
            prop,
            config,
            colConfig,
            rowIndex,
            changeRow
          } = {}) => {
            //value:变化的值,prop:变化的属性,config:组件配置,colConfig:列配置,rowIndex:行序号,changeRow:变化的行对象
            //税额计算
            //计算出账不含税金额
            util.computedByOtherValueOnTable({
              changeProp: prop,
              watchProps: ["taxIncludedMoney", "taxRate"],
              resultProp: "taxExclusivMoney",
              changeRow: changeRow,
              that: that,
              useNextTick: true,
              computedFunc() {
                let comVal =
                  changeRow["taxIncludedMoney"] /
                  (1 + changeRow["taxRate"] / 100);
                comVal = Number.isNaN(comVal) ? "" : comVal.toFixedNum(3);
                comVal += ""; //后端问题,只能存字符串
                return comVal;
              }
            });

            //设置账目项时,关联设置业务科目,IT服务,财务科目
            setSubjectItemRelation({
              value: value,
              prop: prop,
              changeRow: changeRow,
              that: that
            });
          }
          //通过key使用保存在watchFuncs.js中的全局函数,作用是在需要把配置放到服务端保存时使用或者有复用时,其他情况直接使用func即可
          //funcKey:"watchFunc"
        },
        colNameArr: [
          {
            label: "一次性账目项",
            prop: "subjectItemCode",
            propDictLabel: "subjectItem",
            component_type: "select",
            inputMustFill: true,
            mouseOnTipUseValue:true,
            options: {
              dicListName: "revenue_subject_item",
              filterable: true
            }
          },
          {
            component_type: "input",
            label: "业务科目",
            prop: "businessAccountName",
            disable: true,
            mouseOnTipUseValue:true,
            placeholder: "根据账目项选择带出"
          },
          {
            component_type: "input",
            label: "IT服务/产品名称",
            prop: "serviceOrProductName",
            disable: true,
            mouseOnTipUseValue:true,
            placeholder: "根据账目项选择带出",
            span: 8
          },
          {
            component_type: "input",
            label: "财务科目",
            prop: "financialAccountName",
            disable: true,
            mouseOnTipUseValue:true,
            placeholder: "根据账目项选择带出",
            span: 8
          },
          {
            label: "合同阶段（出账条件）",
            prop: "billTerms",
            component_type: "select",
            inputMustFill: true,
            options: {
              dicListName: "bill_terms",
              dicValueUseLabel: true,
            }
          },
          {
            label: "预计报告到达时间",
            prop: "estimatedReportArrivalTime",
            component_type: "date",
            inputMustFill: true,
            valueFormat: "yyyy-MM-dd",
            format: "yyyy-MM-dd"
          },
          {
            label: "约定收入确认时间（预计出账日期）",
            prop: "billDate",
            inputMustFill: true,
            component_type: "date",
            valueFormat: "yyyy-MM-dd",
            format: "yyyy-MM-dd",
          },
          {
            label: "税率(%)",
            prop: "taxRate",
            component_type: "inputNumber",
            step: 1,
            stepStrictly: true,
            min: 0
          },
          {
            label: "出账含税金额（元）",
            prop: "taxIncludedMoney",
            component_type: "inputNumber",
            precision: 3
          },
          {
            component_type: "input", //后端问题,数字要存字符串
            label: "出账不含税金额（元）",
            prop: "taxExclusivMoney",
            inputMustFill: false,
            precision: 3,
            disable: true,
            controls: false,
            span: 8
          },
          ...dynamicCols
        ]
      },
      {
        vif: planFormUseJustShow ? false : true,
        component_type: "buttonAddArrayRow",
        buttonLabel: "新增按月账目项",
        propTarget: fieldMap["IT类按月账目项"],
        buttonType: "primary",
        newRowDefVal: [], //新增默认行填写的数据
        maxlength:20,//最大行数
        elColStyle: "width:auto;margin-top:20px;", //固定按钮盒子宽度
        // showReqStar:true,
        span: 8
      },
      {
        component_type: "table",
        describe: "新增按月账目项",
        prop: fieldMap["IT类按月账目项"],
        // inputMustFill: true,
        blockStyle: "width:initial;margin-left:0;",
        elColStyle: "margin-top:10px;",
        deleteBtnShow: true,
        span: 24,
        colMinWidth: "200px",
        tipInline: true,
        tableInputPlaceholderUseDef: true,
        ...setClientFirstCheckDate(7),
        watchDataChange: {
          //监听数据变化配置//禁止在监听函数中修改该组件本身的值,如一定有,需加上判断限制,防止无限循环
          type: "rowInputValueChange", //目前两种1.inputValueChange:输入数据变化时2.actualValueChange:内部组件实际数据变化时3.(仅表格组件,且回调参数不同)rowInputValueChange:表格行数据变化时
          func: ({
            value,
            prop,
            config,
            colConfig,
            rowIndex,
            changeRow
          } = {}) => {
            //value:变化的值,prop:变化的属性,config:组件配置,colConfig:列配置,rowIndex:行序号,changeRow:变化的行对象

            //计算期数
            util.computedByOtherValueOnTable({
              changeProp: prop,
              watchProps: ["effectiveDate", "failureDate"],
              resultProp: "periods",
              changeRow: changeRow,
              that: that,
              allWatchPropMustHaveValue: true,
              computedFunc() {
                let effectiveDate = new Date(changeRow.effectiveDate);
                let failureDate = new Date(changeRow.failureDate);
                let comVal = Math.ceil(
                  util.datesDiffMonth(failureDate, effectiveDate)
                );
                comVal = Number.isNaN(comVal) ? "" : comVal.toFixedNum(3);
                return comVal;
              }
            });
            //计算每期含税税额
            util.computedByOtherValueOnTable({
              changeProp: prop,
              watchProps: ["taxIncludTotalMoney", "periods"],
              resultProp: "taxIncludedMoney",
              changeRow: changeRow,
              that: that,
              useNextTick: true,
              computedFunc() {
                let comVal =
                  changeRow["taxIncludTotalMoney"] / changeRow["periods"];
                comVal = Number.isNaN(comVal) ? "" : comVal.toFixedNum(3);
                return comVal;
              }
            });
            //计算每期不含税税额
            util.computedByOtherValueOnTable({
              changeProp: prop,
              watchProps: ["taxIncludedMoney", "taxRate"],
              resultProp: "taxExclusivMoney",
              changeRow: changeRow,
              that: that,
              useNextTick: true,
              computedFunc() {
                let comVal =
                  changeRow["taxIncludedMoney"] /
                  (1 + changeRow["taxRate"] / 100);
                comVal = Number.isNaN(comVal) ? "" : comVal.toFixedNum(3);
                comVal += ""; //后端问题,只能存字符串
                return comVal;
              }
            });

            //设置账目项时,关联设置业务科目,IT服务,财务科目
            setSubjectItemRelation({
              value: value,
              prop: prop,
              changeRow: changeRow,
              that: that
            });
          }
          //通过key使用保存在watchFuncs.js中的全局函数,作用是在需要把配置放到服务端保存时使用或者有复用时,其他情况直接使用func即可
          //funcKey:"watchFunc"
        },
        colNameArr: [
          {
            label: "按月账目项",
            prop: "subjectItemCode",
            propDictLabel: "subjectItem",
            component_type: "select",
            inputMustFill: true,
            mouseOnTipUseValue:true,
            options: {
              dicListName: "revenue_subject_item",
              filterable: true
            }
          },
          {
            component_type: "input",
            label: "业务科目",
            prop: "businessAccountName",
            disable: true,
            mouseOnTipUseValue:true,
            placeholder: "根据账目项选择带出"
          },
          {
            component_type: "input",
            label: "IT服务/产品名称",
            prop: "serviceOrProductName",
            disable: true,
            mouseOnTipUseValue:true,
            placeholder: "根据账目项选择带出",
            span: 8
          },
          {
            component_type: "input",
            label: "财务科目",
            prop: "financialAccountName",
            disable: true,
            mouseOnTipUseValue:true,
            placeholder: "根据账目项选择带出",
            span: 8
          },
          {
            label: "合同阶段（出账条件）",
            prop: "billTerms",
            component_type: "select",
            inputMustFill: true,
            options: {
              dicListName: "bill_terms",
              dicValueUseLabel: true,
            }
          },
          {
            label: "出账方式",
            prop: "billingMethod",
            component_type: "select",
            inputMustFill: true,
            /* setConfigByOtherValue:{//测试分组下的表格列自动配置
              setConfigByRowData:true,
              setConfig:{
                prop:"inputMustFill",
                value:true,
                originValue:undefined,
              },
              checkObjByAsyncValidator: {
                "billTerms": [{
                  type: "enum", enum: ['初验'],
                  required:true,//required为false代表该值为空或者不存在时也触发
                }],
              },
            }, */
            options: {
              dicListName: "bill_mode"
            }
          },
          {
            label: "预计报告到达时间",
            prop: "estimatedReportArrivalTime",
            component_type: "date",
            inputMustFill: true,
            valueFormat: "yyyy-MM-dd",
            format: "yyyy-MM-dd"
          },
          {
            label: "预计生效时间",
            prop: "effectiveDate",
            component_type: "date",
            inputMustFill: true,

            valueFormat: "yyyy-MM-dd",
            format: "yyyy-MM-dd"
          },
          {
            label: "预计失效时间",
            prop: "failureDate",
            component_type: "date",
            inputMustFill: true,

            valueFormat: "yyyy-MM-dd",
            format: "yyyy-MM-dd"
          },
          {
            label: "分摊周期(期数)",
            prop: "periods",
            component_type: "inputNumber",
            control: false,
            disable: true
          },
          {
            label: "税率(%)",
            prop: "taxRate",
            component_type: "inputNumber",
            step: 1,
            stepStrictly: true,
            min: 0
          },
          {
            label: "出账含税总金额（元）",
            prop: "taxIncludTotalMoney",
            component_type: "inputNumber",
            precision: 3
          },
          {
            label: "每期含税金额（元）",
            prop: "taxIncludedMoney",
            component_type: "inputNumber",
            precision: 3,
            disable: true,
            controls: false
          },
          {
            label: "每期不含税金额（元）",
            prop: "taxExclusivMoney",
            component_type: "input", //后端问题,数字要存字符串
            precision: 3,
            disable: true,
            controls: false
          },
          ...dynamicCols
        ]
      }
    ],
    ctBlock: [
      {
        label: "CT类：",
        label:
          planFormUse || planFormUseJustShow
            ? "CT类：不可甩单至销售中心"
            : "CT类：",
        component_type: "wordBlock",
        style: {
          "white-space": "pre-wrap",
          "font-size": "14px",
          color: "red"
        }
      },
      {
        vif: planFormUseJustShow ? false : true,
        component_type: "buttonAddArrayRow",
        buttonLabel: "新增一次性账目项",
        propTarget: fieldMap["CT类一次性账目项"],
        buttonType: "primary",
        newRowDefVal: [], //新增默认行填写的数据
        maxlength:20,//最大行数
        elColStyle: "width:auto;margin-top:20px;", //固定按钮盒子宽度
        span: 8
      },
      {
        component_type: "table",
        describe: "新增一次性账目项",
        prop: fieldMap["CT类一次性账目项"],
        inputMustFill: false,
        blockStyle: "width:initial;margin-left:0;",
        elColStyle: "margin-top:10px;",
        deleteBtnShow: true,
        span: 24,
        colMinWidth: "200px",
        tipInline: true,
        tableInputPlaceholderUseDef: true,
        ...setClientFirstCheckDate(5),
        watchDataChange: {
          //监听数据变化配置//禁止在监听函数中修改该组件本身的值,如一定有,需加上判断限制,防止无限循环
          type: "rowInputValueChange", //目前两种1.inputValueChange:输入数据变化时2.actualValueChange:内部组件实际数据变化时3.(仅表格组件,且回调参数不同)rowInputValueChange:表格行数据变化时
          func: ({
            value,
            prop,
            config,
            colConfig,
            rowIndex,
            changeRow
          } = {}) => {
            //value:变化的值,prop:变化的属性,config:组件配置,colConfig:列配置,rowIndex:行序号,changeRow:变化的行对象

            //计算出账含税金额
            util.computedByOtherValueOnTable({
              changeProp: prop,
              watchProps: ["actualUnitPrice", "quantity", "actualPromotion"],
              resultProp: "taxIncludedMoney",
              changeRow: changeRow,
              that: that,
              computedFunc() {
                let comVal =
                  (changeRow["actualUnitPrice"] *
                    changeRow["quantity"] *
                    changeRow["actualPromotion"]) /
                  100;
                comVal = Number.isNaN(comVal) ? "" : comVal.toFixedNum(3);
                return comVal;
              }
            });
            //计算不含税税额
            util.computedByOtherValueOnTable({
              changeProp: prop,
              watchProps: ["taxIncludedMoney", "taxRate"],
              resultProp: "taxExclusivMoney",
              changeRow: changeRow,
              that: that,
              useNextTick: true,
              computedFunc() {
                let comVal =
                  changeRow["taxIncludedMoney"] /
                  (1 + changeRow["taxRate"] / 100);
                comVal = Number.isNaN(comVal) ? "" : comVal.toFixedNum(3);
                comVal += ""; //后端问题,只能存字符串
                return comVal;
              }
            });

            //设置账目项时,关联设置业务科目,IT服务,财务科目
            setSubjectItemRelation({
              value: value,
              prop: prop,
              changeRow: changeRow,
              that: that
            });
          }
          //通过key使用保存在watchFuncs.js中的全局函数,作用是在需要把配置放到服务端保存时使用或者有复用时,其他情况直接使用func即可
          //funcKey:"watchFunc"
        },
        colNameArr: [
          {
            label: "一次性账目项",
            prop: "subjectItemCode",
            propDictLabel: "subjectItem",
            component_type: "select",
            inputMustFill: true,
            mouseOnTipUseValue:true,
            options: {
              dicListName: "ct_revenue_subject_item",
              filterable: true
            }
          },
          {
            component_type: "input",
            label: "业务科目",
            prop: "businessAccountName",
            disable: true,
            mouseOnTipUseValue:true,
            placeholder: "根据账目项选择带出"
          },
          {
            component_type: "input",
            label: "CT服务/产品名称",
            prop: "serviceOrProductName",
            disable: true,
            mouseOnTipUseValue:true,
            placeholder: "根据账目项选择带出",
            span: 8
          },
          {
            component_type: "input",
            label: "财务科目",
            prop: "financialAccountName",
            disable: true,
            mouseOnTipUseValue:true,
            placeholder: "根据账目项选择带出",
            span: 8
          },
          {
            label: "合同阶段（出账条件）",
            prop: "billTerms",
            component_type: "select",
            inputMustFill: true,
            options: {
              dicListName: "bill_terms",
              dicValueUseLabel: true,
            }
          },
          {
            label: "套餐名称",
            prop: "packageName",
            inputMustFill: true,
            component_type: "input"
          },
          {
            label: "预计出账日期",
            prop: "billDate",
            component_type: "date",
            inputMustFill: true,
            valueFormat: "yyyy-MM-dd",
            format: "yyyy-MM-dd"
          },
          {
            label: "实际资费单价（元）",
            prop: "actualUnitPrice",
            component_type: "inputNumber",
            precision: 3
          },
          {
            label: "数量",
            prop: "quantity",
            component_type: "inputNumber",
            step: 1,
            stepStrictly: true,
            min: 0
          },
          {
            label: "实际促销(%)",
            prop: "actualPromotion",
            component_type: "inputNumber",
            step: 1,
            stepStrictly: false,
            min: 0,
            max: 100
          },
          {
            label: "税率(%)",
            prop: "taxRate",
            component_type: "inputNumber",
            step: 1,
            stepStrictly: true,
            min: 0
          },
          {
            label: "出账含税总金额（总资费）（元）",
            prop: "taxIncludedMoney",
            component_type: "inputNumber",
            precision: 3,
            disable: true,
            controls: false
          },
          {
            label: "出账不含税金额（元）",
            prop: "taxExclusivMoney",
            component_type: "input", //后端问题,数字要存字符串
            precision: 3,
            disable: true,
            controls: false
          },
          ...dynamicCols
        ]
      },
      {
        vif: planFormUseJustShow ? false : true,
        component_type: "buttonAddArrayRow",
        buttonLabel: "新增按月账目项",
        propTarget: fieldMap["CT类按月账目项"],
        buttonType: "primary",
        newRowDefVal: [], //新增默认行填写的数据
        maxlength:20,//最大行数
        elColStyle: "width:auto;margin-top:20px;", //固定按钮盒子宽度
        span: 8
      },
      {
        component_type: "table",
        describe: "新增按月账目项",
        prop: fieldMap["CT类按月账目项"],
        inputMustFill: false,
        blockStyle: "width:initial;margin-left:0;",
        elColStyle: "margin-top:10px;",
        deleteBtnShow: true,
        span: 24,
        colMinWidth: "200px",
        tipInline: true,
        tableInputPlaceholderUseDef: true,
        ...setClientFirstCheckDate(5),
        watchDataChange: {
          //监听数据变化配置//禁止在监听函数中修改该组件本身的值,如一定有,需加上判断限制,防止无限循环
          type: "rowInputValueChange", //目前两种1.inputValueChange:输入数据变化时2.actualValueChange:内部组件实际数据变化时3.(仅表格组件,且回调参数不同)rowInputValueChange:表格行数据变化时
          func: ({
            value,
            prop,
            config,
            colConfig,
            rowIndex,
            changeRow
          } = {}) => {
            //value:变化的值,prop:变化的属性,config:组件配置,colConfig:列配置,rowIndex:行序号,changeRow:变化的行对象

            //计算期数
            util.computedByOtherValueOnTable({
              changeProp: prop,
              watchProps: ["effectiveDate", "failureDate"],
              resultProp: "periods",
              changeRow: changeRow,
              that: that,
              allWatchPropMustHaveValue: true,
              computedFunc() {
                let effectiveDate = new Date(changeRow.effectiveDate);
                let failureDate = new Date(changeRow.failureDate);
                let comVal = Math.ceil(
                  util.datesDiffMonth(failureDate, effectiveDate)
                );
                comVal = Number.isNaN(comVal) ? "" : comVal.toFixedNum(3);
                return comVal;
              }
            });
            //计算出账含税总金额
            util.computedByOtherValueOnTable({
              changeProp: prop,
              watchProps: ["actualUnitPrice", "quantity", "actualPromotion"],
              resultProp: "taxIncludTotalMoney",
              changeRow: changeRow,
              that: that,
              computedFunc() {
                let comVal =
                  (changeRow["actualUnitPrice"] *
                    changeRow["quantity"] *
                    changeRow["actualPromotion"]) /
                  100;
                comVal = Number.isNaN(comVal) ? "" : comVal.toFixedNum(3);
                return comVal;
              }
            });
            //计算每期含税税额
            util.computedByOtherValueOnTable({
              changeProp: prop,
              watchProps: ["taxIncludTotalMoney", "periods"],
              resultProp: "taxIncludedMoney",
              changeRow: changeRow,
              that: that,
              useNextTick: true,
              computedFunc() {
                let comVal =
                  changeRow["taxIncludTotalMoney"] / changeRow["periods"];
                comVal = Number.isNaN(comVal) ? "" : comVal.toFixedNum(3);
                return comVal;
              }
            });
            //计算每期不含税税额
            util.computedByOtherValueOnTable({
              changeProp: prop,
              watchProps: ["taxIncludedMoney", "taxRate"],
              resultProp: "taxExclusivMoney",
              changeRow: changeRow,
              that: that,
              useNextTick: true,
              computedFunc() {
                let comVal =
                  changeRow["taxIncludedMoney"] /
                  (1 + changeRow["taxRate"] / 100);
                comVal = Number.isNaN(comVal) ? "" : comVal.toFixedNum(3);
                comVal += ""; //后端问题,只能存字符串
                return comVal;
              }
            });

            //设置账目项时,关联设置业务科目,IT服务,财务科目
            setSubjectItemRelation({
              value: value,
              prop: prop,
              changeRow: changeRow,
              that: that
            });
          }
          //通过key使用保存在watchFuncs.js中的全局函数,作用是在需要把配置放到服务端保存时使用或者有复用时,其他情况直接使用func即可
          //funcKey:"watchFunc"
        },
        colNameArr: [
          {
            label: "按月账目项",
            prop: "subjectItemCode",
            propDictLabel: "subjectItem",
            component_type: "select",
            inputMustFill: true,
            mouseOnTipUseValue:true,
            options: {
              dicListName: "ct_revenue_subject_item",
              filterable: true
            }
          },
          {
            component_type: "input",
            label: "业务科目",
            prop: "businessAccountName",
            disable: true,
            mouseOnTipUseValue:true,
            placeholder: "根据账目项选择带出"
          },
          {
            component_type: "input",
            label: "CT服务/产品名称",
            prop: "serviceOrProductName",
            disable: true,
            mouseOnTipUseValue:true,
            placeholder: "根据账目项选择带出",
            span: 8
          },
          {
            component_type: "input",
            label: "财务科目",
            prop: "financialAccountName",
            disable: true,
            mouseOnTipUseValue:true,
            placeholder: "根据账目项选择带出",
            span: 8
          },
          {
            label: "合同阶段（出账条件）",
            prop: "billTerms",
            component_type: "select",
            inputMustFill: true,
            options: {
              dicListName: "bill_terms",
              dicValueUseLabel: true,
            }
          },
          {
            label: "套餐名称",
            prop: "packageName",
            inputMustFill: true,
            component_type: "input"
          },
          {
            label: "预计生效时间",
            prop: "effectiveDate",
            component_type: "date",
            inputMustFill: true,
            valueFormat: "yyyy-MM-dd",
            format: "yyyy-MM-dd"
          },
          {
            label: "预计失效时间",
            prop: "failureDate",
            component_type: "date",
            inputMustFill: true,
            valueFormat: "yyyy-MM-dd",
            format: "yyyy-MM-dd"
          },
          {
            label: "期数（计费周期）",
            prop: "periods",
            component_type: "inputNumber",
            control: false,
            disable: true
          },
          {
            label: "实际资费单价（元）",
            prop: "actualUnitPrice",
            component_type: "inputNumber",
            precision: 3
          },
          {
            label: "数量",
            prop: "quantity",
            component_type: "inputNumber",
            step: 1,
            stepStrictly: true,
            min: 0
          },
          {
            label: "实际促销(%)",
            prop: "actualPromotion",
            component_type: "inputNumber",
            step: 1,
            stepStrictly: false,
            min: 0,
            max: 100
          },
          {
            label: "出账含税总金额（元）",
            prop: "taxIncludTotalMoney",
            component_type: "inputNumber",
            precision: 3,
            disable: true,
            controls: false
          },
          {
            label: "税率(%)",
            prop: "taxRate",
            component_type: "inputNumber",
            step: 1,
            stepStrictly: true,
            min: 0
          },
          {
            label: "每期含税金额（元）",
            prop: "taxIncludedMoney",
            component_type: "inputNumber",
            precision: 3,
            disable: true,
            controls: false
          },
          {
            label: "每期不含税金额（元）",
            prop: "taxExclusivMoney",
            component_type: "input", //后端问题,数字要存字符串
            precision: 3,
            disable: true,
            controls: false
          },
          ...dynamicCols
        ]
      }
    ]
  };
  let result = [...config.itBlock, ...config.ctBlock];
  if (planFormUseJustShow) {
    util.loop(result, (item, index) => {
      item.disable = true;
      if(item.component_type === "table"){
        util.loop(item.colNameArr,(item2,index2)=>{
          item2.component_type = "show";
        });
        item.watchDataChange = undefined;
      }
    });
  }
  return result;
};
//顺便获取账目项关系,设置全局单独字段保存
const getSubjectItemListAndSetDict = () => {
  let param = {};
  util
    .apiHttp({
      url: "/workflow/processBusinessManage/getSubjectItemList",
      param: param,
      showLoading: false,
      repeatCheck: true,
      codeErrorFailCallBack: true,
      storageTime: 1000 * 60 * 60,
      failCallBack: res => {},
      completeCallBack: res => {}
    })
    .then(res => {
      console.log("账目项关系-接口返回");
      store.state.subjectItemRelationList = res.datas;
    });
};
//设置账目项时,关联设置业务科目,IT服务,财务科目
const setSubjectItemRelation = ({ value, prop, changeRow, that }) => {
  if (prop === "subjectItemCode") {
    let relationItem = store.state["subjectItemRelationList"].find(item => {
      return value === item.subjectItemCode;
    });
    let setPropArr = [
      "businessAccount",
      "financialAccount",
      "serviceOrProduct",
      "businessAccountName",
      "financialAccountName",
      "serviceOrProductName",
    ];
    if (relationItem) {
      util.loop(setPropArr,(item,index)=>{
        console.log("设置账目项时,关联设置",relationItem[item]);
        that.$set(changeRow, item, relationItem[item]);
      });
    }
    else{
      util.loop(setPropArr,(item,index)=>{
        that.$set(changeRow, item, "");
      });
    }
  }
};
/* 收入计划表格 */

/* 收款计划表格 */
const collectPlanTable = ({ name = "", that, useBy , taskKey} = {}) => {
  let fieldMap = _fieldMap["新前向合同"];
  let planFormUse = ["收款计划变更-变更后计划"].includes(useBy);
  let planFormUseJustShow = [
    "收款计划与进度_项目全景视图",
    "收款计划变更-原收入计划"
  ].includes(useBy);
  let dynamicCols = planFormUseJustShow
  ? []: [{ label: "操作", isOpera: true }];

  let config = [
    {
      component_type: "buttonAddArrayRow",
      buttonLabel: "新增非周期收款项",
      propTarget: fieldMap["非周期收款项"],
      buttonType: "primary",
      maxlength:20,//最大行数
      newRowDefVal: [], //新增默认行填写的数据
      maxlength:20,//最大行数
      elColStyle: "width:auto;margin-top:20px;", //固定按钮盒子宽度
      span: 8
    },
    {
      component_type: "table",
      describe: "新增非周期收款项",
      prop: fieldMap["非周期收款项"],
      inputMustFill: false,
      blockStyle: "width:initial;margin-left:0;",
      elColStyle: "margin-top:10px;",
      deleteBtnShow: true,
      span: 24,
      colMinWidth: "200px",
      tipInline: true,
      tableInputPlaceholderUseDef: true,
      colNameArr: [
        {
          label: "第N次",
          prop: "number",
          inputMustFill: true,
          component_type: "input"
        },
        {
          label: "收款条件",
          prop: "gatheringTerms",
          component_type: "input",
          inputMustFill: true
        },
        {
          label: "收款控制节点",
          prop: "collectionControlNode",
          component_type: "select",
          inputMustFill: true,
          options: {
            dicListName: "collection_control_node"
          }
        },
        {
          label: "预计报告到达时间",
          prop: "estimatedReportArrivalTime",
          inputMustFill: true,

          component_type: "date",
          valueFormat: "yyyy-MM-dd",
          format: "yyyy-MM-dd"
        },

        {
          label: "计划回款日期",
          prop: "gatheringDate",
          inputMustFill: true,

          component_type: "date",
          valueFormat: "yyyy-MM-dd",
          format: "yyyy-MM-dd"
        },
        {
          label: "收款含税金额(计划回款金额)（元）",
          prop: "taxIncludedMoney",
          inputMustFill: true,
          component_type: "inputNumber",
          precision: 3
        },

        {
          label: "是否质保金",
          prop: "warrantyWhether",
          component_type: "select",
          inputMustFill: true,
          options: {
            dicListName: "boolean_select"
          }
        },
        {
          label: "是否满足合同资产",
          prop: "contractAssetsSatisfied",
          component_type: "select",
          options: {
            dicListName: "boolean_select"
          },
          inputMustFill:true,
          disable:taskKey==="beforeContractDraft_mid2"?false:true,
        },
        ...dynamicCols,
      ]
    },
    {
      component_type: "buttonAddArrayRow",
      buttonLabel: "新增周期收款项",
      propTarget: fieldMap["周期收款项"],
      buttonType: "primary",
      newRowDefVal: [], //新增默认行填写的数据
      maxlength:20,//最大行数
      elColStyle: "width:auto;margin-top:20px;", //固定按钮盒子宽度
      span: 8
    },
    {
      component_type: "table",
      describe: "新增周期收款项",
      prop: fieldMap["周期收款项"],
      inputMustFill: false,
      blockStyle: "width:initial;margin-left:0;",
      elColStyle: "margin-top:10px;",
      deleteBtnShow: true,
      span: 24,
      colMinWidth: "200px",
      tipInline: true,
      tableInputPlaceholderUseDef: true,
      watchDataChange: {
        //监听数据变化配置//禁止在监听函数中修改该组件本身的值,如一定有,需加上判断限制,防止无限循环
        type: "rowInputValueChange", //目前两种1.inputValueChange:输入数据变化时2.actualValueChange:内部组件实际数据变化时3.(仅表格组件,且回调参数不同)rowInputValueChange:表格行数据变化时
        func: ({
          value,
          prop,
          config,
          colConfig,
          rowIndex,
          changeRow
        } = {}) => {
          //value:变化的值,prop:变化的属性,config:组件配置,colConfig:列配置,rowIndex:行序号,changeRow:变化的行对象

          //计算期数
          util.computedByOtherValueOnTable({
            changeProp: prop,
            watchProps: ["effectiveDate", "failureDate", "dateSelect"],
            resultProp: "periods",
            changeRow: changeRow,
            that: that,
            allWatchPropMustHaveValue: true,
            computedFunc() {
              let effectiveDate = new Date(changeRow.effectiveDate);
              let failureDate = new Date(changeRow.failureDate);
              let comVal = Math.ceil(
                util.datesDiffMonth(failureDate, effectiveDate) /
                  changeRow.dateSelect
              );
              comVal = Number.isNaN(comVal) ? "" : comVal.toFixedNum(3);
              return comVal;
            }
          });
          //计算每期含税税额
          util.computedByOtherValueOnTable({
            changeProp: prop,
            watchProps: ["collectionTaxIncludedMoney", "periods"],
            resultProp: "taxIncludedMoney",
            changeRow: changeRow,
            that: that,
            useNextTick: true,
            computedFunc() {
              let comVal =
                changeRow["collectionTaxIncludedMoney"] / changeRow["periods"];
              comVal = Number.isNaN(comVal) ? "" : comVal.toFixedNum(3);
              return comVal;
            }
          });
        }
        //通过key使用保存在watchFuncs.js中的全局函数,作用是在需要把配置放到服务端保存时使用或者有复用时,其他情况直接使用func即可
        //funcKey:"watchFunc"
      },
      colNameArr: [
        {
          label: "收款条件",
          prop: "gatheringTerms",
          component_type: "input",
          inputMustFill: true
        },
        {
          label: "周期",
          prop: "dateSelect",
          component_type: "select",
          inputMustFill: true,

          options: {
            dicListName: "date_select"
          }
        },
        {
          label: "收款控制节点",
          prop: "collectionControlNode",
          component_type: "select",
          inputMustFill: true,
          options: {
            dicListName: "collection_control_node"
          }
        },
        {
          label: "预计报告到达时间",
          prop: "estimatedReportArrivalTime",
          inputMustFill: true,

          component_type: "date",
          valueFormat: "yyyy-MM-dd",
          format: "yyyy-MM-dd"
        },
        {
          label: "预计生效时间",
          prop: "effectiveDate",
          inputMustFill: true,

          component_type: "date",
          valueFormat: "yyyy-MM-dd",
          format: "yyyy-MM-dd"
        },
        {
          label: "预计失效时间",
          prop: "failureDate",
          inputMustFill: true,

          component_type: "date",
          valueFormat: "yyyy-MM-dd",
          format: "yyyy-MM-dd"
        },
        {
          label: "期数",
          prop: "periods",
          component_type: "inputNumber",
          control: false,
          disable: true
        },
        {
          label: "收款含税金额(计划回款金额)（元）",
          prop: "collectionTaxIncludedMoney",
          inputMustFill: true,
          component_type: "inputNumber",
          precision: 3
        },
        {
          label: "每期含税金额（元）",
          prop: "taxIncludedMoney",
          component_type: "inputNumber",
          precision: 3,
          disable: true,
          controls: false
        },
        {
          label: "是否满足合同资产",
          prop: "contractAssetsSatisfied",
          component_type: "select",
          options: {
            dicListName: "boolean_select"
          },
          inputMustFill:true,
          disable:taskKey==="beforeContractDraft_mid2"?false:true,
        },
        ...dynamicCols
      ]
    }
  ];
  return [...config];
};
/* 收款计划表格 */

/* 支出计划表格 */
const expenditurePlanTable = ({ name = "", that,useBy } = {}) => {
  let fieldMap = _fieldMap["新后向合同"];
  let planFormUse = ["支出计划变更-变更后计划"].includes(useBy);
  let planFormUseJustShow = [
    "支出计划与进度_项目全景视图",
    "支出计划变更-原支出计划"
  ].includes(useBy);
  let dynamicCols = planFormUseJustShow
  ? []: [{ label: "操作", isOpera: true }];
  let config = [
    {
      vif: planFormUseJustShow ? false : true,
      component_type: "buttonAddArrayRow",
      buttonLabel: "新增非周期支出项",
      propTarget: planFormUseJustShow||planFormUse?fieldMap["旧非周期支出项"]:fieldMap["新非周期支出项"],
      buttonType: "primary",
      newRowDefVal: [], //新增默认行填写的数据
      maxlength:20,//最大行数
      elColStyle: "width:auto;margin-top:20px;", //固定按钮盒子宽度
      // showReqStar: true,
      span: 8
    },
    {
      component_type: "table",
      describe: "新增非周期支出项",
      prop: planFormUseJustShow||planFormUse?fieldMap["旧非周期支出项"]:fieldMap["新非周期支出项"],
      inputMustFill: false,
      blockStyle: "width:initial;margin-left:0;",
      elColStyle: "margin-top:10px;",
      deleteBtnShow: true,
      span: 24,
      colMinWidth: "200px",
      tipInline: true,
      tableInputPlaceholderUseDef: true,
      watchNotPageInitDataProp:{
        //这里不该使用该配置,应该在"支出计划含税合计金额"组件上使用watchDataChange,这里是测试新配置用
        //理论上该配置也可用于监听其他组件值,但是不应该这么使用,监听值时,应在对应组件配置中使用watchDataChange,这里只用于监听非组件的表单值
        watchProps:["totalPriceExpenditure"],
        func:({changeValue,changeProp,componentValue,formInputData})=>{
          //计算支付比例
          //componentValue:该组件值
          console.log("测试监听非组件的表单值");
          Array.isArray(componentValue) && util.loop(componentValue,(row_item,row_index)=>{
            let comVal = row_item["taxIncludedMoney"] / changeValue;
            comVal *= 100;
            comVal = Number.isNaN(comVal) ? "" : comVal.toFixedNum(2);
            row_item["payRate"] = comVal;
          });
        },
      },
      watchDataChange: {
        //监听数据变化配置//禁止在监听函数中修改该组件本身的值,如一定有,需加上判断限制,防止无限循环
        type: "rowInputValueChange", //目前两种1.inputValueChange:输入数据变化时2.actualValueChange:内部组件实际数据变化时3.(仅表格组件,且回调参数不同)rowInputValueChange:表格行数据变化时
        func: ({
          value,
          prop,
          config,
          colConfig,
          rowIndex,
          changeRow,
          formInputData,
        } = {}) => {
          //value:变化的值,prop:变化的属性,config:组件配置,colConfig:列配置,rowIndex:行序号,changeRow:变化的行对象
          //计算支付比例
          util.computedByOtherValueOnTable({
            changeProp: prop,
            watchProps: ["taxIncludedMoney"],
            resultProp: "payRate",
            changeRow: changeRow,
            that: that,
            useNextTick: true,
            computedFunc() {
              let comVal =
                changeRow["taxIncludedMoney"] / formInputData["totalPriceExpenditure"];
              comVal *= 100;
              comVal = Number.isNaN(comVal) ? "" : comVal.toFixedNum(2);
              return comVal;
            }
          });
        }
        //通过key使用保存在watchFuncs.js中的全局函数,作用是在需要把配置放到服务端保存时使用或者有复用时,其他情况直接使用func即可
        //funcKey:"watchFunc"
      },
      colNameArr: [
        {
          label: "第N次",
          prop: "number",
          inputMustFill: true,
          component_type: "input"
        },
        {
          component_type:"input",
          label:"支出条件",
          prop:"gatheringTerms",
          inputMustFill:true,
        },
        {
          label: "预计支出日期",
          prop: "gatheringDate",
          inputMustFill: true,

          component_type: "date",
          valueFormat: "yyyy-MM-dd",
          format: "yyyy-MM-dd"
        },
        {
          label: "支出含税金额（元）",
          prop: "taxIncludedMoney",
          inputMustFill: true,
          component_type: "inputNumber",
          precision: 3
        },
        {
          component_type:"inputNumber",
          label:"支付比例",
          prop:"payRate",
          disable:true,
          controls: false,
          span:8,
        },
        ...dynamicCols,
      ]
    },
    {
      vif: planFormUseJustShow ? false : true,
      component_type: "buttonAddArrayRow",
      buttonLabel: "新增周期支出项",
      propTarget: planFormUseJustShow||planFormUse?fieldMap["旧周期支出项"]:fieldMap["新周期支出项"],
      buttonType: "primary",
      newRowDefVal: [], //新增默认行填写的数据
      maxlength:20,//最大行数
      elColStyle: "width:auto;margin-top:20px;", //固定按钮盒子宽度
      span: 8
    },
    {
      component_type: "table",
      describe: "新增周期支出项",
      prop: planFormUseJustShow||planFormUse?fieldMap["旧周期支出项"]:fieldMap["新周期支出项"],
      inputMustFill: false,
      blockStyle: "width:initial;margin-left:0;",
      elColStyle: "margin-top:10px;",
      deleteBtnShow: true,
      span: 24,
      colMinWidth: "200px",
      tipInline: true,
      tableInputPlaceholderUseDef: true,
      watchNotPageInitDataProp:{
        //这里不该使用该配置,应该在"支出计划含税合计金额"组件上使用watchDataChange,这里是测试新配置用
        //理论上该配置也可用于监听其他组件值,但是不应该这么使用,监听值时,应在对应组件配置中使用watchDataChange,这里只用于监听非组件的表单值
        watchProps:["totalPriceExpenditure"],
        func:({changeValue,changeProp,componentValue,formInputData})=>{
          //计算支付比例
          //componentValue:该组件值
          console.log("测试监听非组件的表单值");
          Array.isArray(componentValue) && util.loop(componentValue,(row_item,row_index)=>{
            let comVal = row_item["expenditureIncludedMoney"] / changeValue;
            comVal *= 100;
            comVal = Number.isNaN(comVal) ? "" : comVal.toFixedNum(2);
            row_item["payRate"] = comVal;
          });
        },
      },
      watchDataChange: {
        //监听数据变化配置//禁止在监听函数中修改该组件本身的值,如一定有,需加上判断限制,防止无限循环
        type: "rowInputValueChange", //目前两种1.inputValueChange:输入数据变化时2.actualValueChange:内部组件实际数据变化时3.(仅表格组件,且回调参数不同)rowInputValueChange:表格行数据变化时
        func: ({
          value,
          prop,
          config,
          colConfig,
          rowIndex,
          changeRow,
          formInputData,
        } = {}) => {
          //value:变化的值,prop:变化的属性,config:组件配置,colConfig:列配置,rowIndex:行序号,changeRow:变化的行对象

          //计算期数
          util.computedByOtherValueOnTable({
            changeProp: prop,
            watchProps: ["effectiveDate", "failureDate", "dateSelect"],
            resultProp: "periods",
            changeRow: changeRow,
            that: that,
            allWatchPropMustHaveValue: true,
            computedFunc() {
              let effectiveDate = new Date(changeRow.effectiveDate);
              let failureDate = new Date(changeRow.failureDate);
              let comVal = Math.ceil(
                util.datesDiffMonth(failureDate, effectiveDate) /
                  changeRow.dateSelect
              );
              comVal = Number.isNaN(comVal) ? "" : comVal.toFixedNum(3);
              return comVal;
            }
          });
          //计算每期含税税额
          util.computedByOtherValueOnTable({
            changeProp: prop,
            watchProps: ["expenditureIncludedMoney", "periods"],
            resultProp: "taxIncludedMoney",
            changeRow: changeRow,
            that: that,
            useNextTick: true,
            computedFunc() {
              let comVal =
                changeRow["expenditureIncludedMoney"] / changeRow["periods"];
              comVal = Number.isNaN(comVal) ? "" : comVal.toFixedNum(3);
              return comVal;
            }
          });
          //计算支付比例
          util.computedByOtherValueOnTable({
            changeProp: prop,
            watchProps: ["expenditureIncludedMoney"],
            resultProp: "payRate",
            changeRow: changeRow,
            that: that,
            useNextTick: true,
            computedFunc() {
              let comVal =
                changeRow["expenditureIncludedMoney"] / formInputData["totalPriceExpenditure"];
              comVal *= 100;
              comVal = Number.isNaN(comVal) ? "" : comVal.toFixedNum(2);
              return comVal;
            }
          });
        }
        //通过key使用保存在watchFuncs.js中的全局函数,作用是在需要把配置放到服务端保存时使用或者有复用时,其他情况直接使用func即可
        //funcKey:"watchFunc"
      },
      colNameArr: [
        {
          component_type:"input",
          label:"支出条件",
          prop:"gatheringTerms",
          inputMustFill:true,
        },
        {
          label: "周期",
          prop: "dateSelect",
          component_type: "select",
          inputMustFill: true,
          options: {
            dicListName: "date_select"
          }
        },
        {
          label: "预计生效时间",
          prop: "effectiveDate",
          inputMustFill: true,
          component_type: "date",
          valueFormat: "yyyy-MM-dd",
          format: "yyyy-MM-dd"
        },
        {
          label: "预计失效时间",
          prop: "failureDate",
          inputMustFill: true,
          component_type: "date",
          valueFormat: "yyyy-MM-dd",
          format: "yyyy-MM-dd"
        },
        {
          label: "期数",
          prop: "periods",
          component_type: "inputNumber",
          control: false,
          disable: true
        },
        {
          label: "支出含税金额（元）",
          prop: "expenditureIncludedMoney",
          inputMustFill: true,
          component_type: "inputNumber",
          precision: 3
        },
        {
          label: "每期含税金额（元）",
          prop: "taxIncludedMoney",
          component_type: "inputNumber",
          precision: 3,
          disable: true,
          controls: false
        },
        {
          component_type:"inputNumber",
          label:"支付比例",
          prop:"payRate",
          disable:true,
          controls: false,
          span:8,
        },
        ...dynamicCols,
      ]
    }
  ];
  if (planFormUseJustShow) {
    util.loop(config, (item, index) => {
      item.disable = true;
      if(item.component_type === "table"){
        util.loop(item.colNameArr,(item2,index2)=>{
          item2.component_type = "show";
        });
        item.watchDataChange = undefined;
      }
    });
  }
  return [...config];
};
/* 支出计划表格 */

/* 成本计划表格 */
const costPlanTable = ({ name = "", that,useBy } = {}) => {
  let fieldMap = _fieldMap["新后向合同"];
  let planFormUse = ["成本计划变更-变更后计划"].includes(useBy);
  let planFormUseJustShow = [
    "成本计划与进度_项目全景视图",
    "成本计划变更-原成本计划"
  ].includes(useBy);
  let dynamicCols = planFormUseJustShow
  ? []: [{ label: "操作", isOpera: true }];
  let config = [
    {
      vif: planFormUseJustShow ? false : true,
      component_type: "buttonAddArrayRow",
      buttonLabel: "新增一次性会计科目项",
      propTarget: planFormUseJustShow||planFormUse?fieldMap["旧一次性会计科目项"]:fieldMap["新一次性会计科目项"],
      buttonType: "primary",
      newRowDefVal: [], //新增默认行填写的数据
      maxlength:20,//最大行数
      elColStyle: "width:auto;margin-top:20px;", //固定按钮盒子宽度
      span: 8
    },
    {
      component_type: "table",
      describe: "新增一次性会计科目项",
      prop: planFormUseJustShow||planFormUse?fieldMap["旧一次性会计科目项"]:fieldMap["新一次性会计科目项"],
      inputMustFill: false,
      blockStyle: "width:initial;margin-left:0;",
      elColStyle: "margin-top:10px;",
      deleteBtnShow: true,
      span: 24,
      colMinWidth: "200px",
      tipInline: true,
      tableInputPlaceholderUseDef: true,
      watchDataChange: {
        //监听数据变化配置//禁止在监听函数中修改该组件本身的值,如一定有,需加上判断限制,防止无限循环
        type: "rowInputValueChange", //目前两种1.inputValueChange:输入数据变化时2.actualValueChange:内部组件实际数据变化时3.(仅表格组件,且回调参数不同)rowInputValueChange:表格行数据变化时
        func: ({
          value,
          prop,
          config,
          colConfig,
          rowIndex,
          changeRow
        } = {}) => {
          //value:变化的值,prop:变化的属性,config:组件配置,colConfig:列配置,rowIndex:行序号,changeRow:变化的行对象

          //计算不含税税额
          util.computedByOtherValueOnTable({
            changeProp: prop,
            watchProps: ["taxIncludedMoney", "taxRate"],
            resultProp: "taxExclusivMoney",
            changeRow: changeRow,
            that: that,
            useNextTick: true,
            computedFunc() {
              let comVal =
                changeRow["taxIncludedMoney"] /
                (1 + changeRow["taxRate"] / 100);
              comVal = Number.isNaN(comVal) ? "" : comVal.toFixedNum(3);
              comVal += ""; //后端问题,只能存字符串
              return comVal;
            }
          });

          //设置科目项时,关联设置
          setSubjectItemRelationCT({
            value: value,
            prop: prop,
            changeRow: changeRow,
            that: that
          });
        }
        //通过key使用保存在watchFuncs.js中的全局函数,作用是在需要把配置放到服务端保存时使用或者有复用时,其他情况直接使用func即可
        //funcKey:"watchFunc"
      },
      colNameArr: [
        {
          label: "一次性会计科目项",
          prop: "subjectItem",
          component_type: "select",
          inputMustFill: true,
          mouseOnTipUseValue:true,
          options: {
            dicListName: "cost_subject_item",
            dicValueUseLabel: true
          }
        },
        {
          component_type: "input",
          label: "支出产品",
          prop: "expendProduct",
          disable: true,
          mouseOnTipUseValue:true,
          placeholder: "根据科目项选择带出"
        },
        {
          component_type: "input",
          label: "对应收入的产品名称",
          prop: "revenueProduct",
          disable: true,
          mouseOnTipUseValue:true,
          placeholder: "根据科目项选择带出"
        },
        {
          component_type: "input",
          label: "对应收入的产品实例编码（计费码）",
          prop: "revenueProductCode",
          disable: true,
          mouseOnTipUseValue:true,
          placeholder: "根据科目项选择带出"
        },
        {
          component_type:"select",
          label:"支出条件",
          prop:"expendTerms",
          inputMustFill:true,
          options:{
            dicListName:"expend_condition",
          },
        },
        {
          label: "预计支出日期",
          prop: "expendDate",
          inputMustFill: true,
          component_type: "date",
          valueFormat: "yyyy-MM-dd",
          format: "yyyy-MM-dd"
        },
        {
          label: "税率(%)",
          prop: "taxRate",
          component_type: "inputNumber",
          step: 1,
          stepStrictly: true,
          min: 0
        },
        {
          label: "支出含税金额（元）",
          prop: "taxIncludedMoney",
          component_type: "inputNumber",
          precision: 3,
          min: 0
        },
        {
          label: "支出不含税金额（元）",
          prop: "taxExclusivMoney",
          component_type: "inputNumber",
          precision: 3,
          disable: true,
          min: 0
        },
        {
          component_type: "input",
          label: "预算编码",
          prop: "budgetCode",
          inputMustFill: false,
          span: 8
        },
        {
          component_type: "input",
          label: "订单编码",
          prop: "orderCode",
          inputMustFill: false,
          span: 8
        },
        {
          component_type:"inputNumber",
          label:"对应出账金额（元）",
          prop:"outgoingAmount",
          inputMustFill:true,
          precision: undefined,
          min:undefined,
          max:undefined,
          span:8,
        },
        {
          component_type:"inputNumber",
          label:"对应实收金额（元）",
          prop:"actualAmount",
          inputMustFill:true,
          precision: undefined,
          min:undefined,
          max:undefined,
          span:8,
        },
        ...dynamicCols,
      ]
    },
    {
      vif: planFormUseJustShow ? false : true,
      component_type: "buttonAddArrayRow",
      buttonLabel: "新增按月会计科目项",
      propTarget: planFormUseJustShow||planFormUse?fieldMap["旧按月会计科目项"]:fieldMap["新按月会计科目项"],
      buttonType: "primary",
      newRowDefVal: [], //新增默认行填写的数据
      maxlength:20,//最大行数
      elColStyle: "width:auto;margin-top:20px;", //固定按钮盒子宽度
      span: 8
    },
    {
      component_type: "table",
      describe: "新增按月会计科目项",
      prop: planFormUseJustShow||planFormUse?fieldMap["旧按月会计科目项"]:fieldMap["新按月会计科目项"],
      inputMustFill: false,
      blockStyle: "width:initial;margin-left:0;",
      elColStyle: "margin-top:10px;",
      deleteBtnShow: true,
      span: 24,
      colMinWidth: "200px",
      tipInline: true,
      tableInputPlaceholderUseDef: true,
      watchDataChange: {
        //监听数据变化配置//禁止在监听函数中修改该组件本身的值,如一定有,需加上判断限制,防止无限循环
        type: "rowInputValueChange", //目前两种1.inputValueChange:输入数据变化时2.actualValueChange:内部组件实际数据变化时3.(仅表格组件,且回调参数不同)rowInputValueChange:表格行数据变化时
        func: ({
          value,
          prop,
          config,
          colConfig,
          rowIndex,
          changeRow
        } = {}) => {
          //value:变化的值,prop:变化的属性,config:组件配置,colConfig:列配置,rowIndex:行序号,changeRow:变化的行对象

          //计算期数
          util.computedByOtherValueOnTable({
            changeProp: prop,
            watchProps: ["effectiveDate", "failureDate"],
            resultProp: "periods",
            changeRow: changeRow,
            that: that,
            allWatchPropMustHaveValue: true,
            computedFunc() {
              let effectiveDate = new Date(changeRow.effectiveDate);
              let failureDate = new Date(changeRow.failureDate);
              let comVal = Math.ceil(
                util.datesDiffMonth(failureDate, effectiveDate)
              );
              comVal = Number.isNaN(comVal) ? "" : comVal.toFixedNum(3);
              return comVal;
            }
          });
          //计算每期含税税额
          util.computedByOtherValueOnTable({
            changeProp: prop,
            watchProps: ["expenditureIncludedMoney", "periods"],
            resultProp: "taxIncludedMoney",
            changeRow: changeRow,
            that: that,
            useNextTick: true,
            computedFunc() {
              let comVal =
                changeRow["expenditureIncludedMoney"] / changeRow["periods"];
              comVal = Number.isNaN(comVal) ? "" : comVal.toFixedNum(3);
              return comVal;
            }
          });
          //计算每期不含税税额
          util.computedByOtherValueOnTable({
            changeProp: prop,
            watchProps: ["taxIncludedMoney", "taxRate"],
            resultProp: "taxExclusivMoney",
            changeRow: changeRow,
            that: that,
            useNextTick: true,
            computedFunc() {
              let comVal =
                changeRow["taxIncludedMoney"] /
                (1 + changeRow["taxRate"] / 100);
              comVal = Number.isNaN(comVal) ? "" : comVal.toFixedNum(3);
              comVal += ""; //后端问题,只能存字符串
              return comVal;
            }
          });

          //设置科目项时,关联设置
          setSubjectItemRelationCT({
            value: value,
            prop: prop,
            changeRow: changeRow,
            that: that
          });
        }
        //通过key使用保存在watchFuncs.js中的全局函数,作用是在需要把配置放到服务端保存时使用或者有复用时,其他情况直接使用func即可
        //funcKey:"watchFunc"
      },
      colNameArr: [
        {
          label: "按月会计科目项",
          prop: "subjectItem",
          component_type: "select",
          inputMustFill: true,
          mouseOnTipUseValue:true,
          options: {
            dicListName: "cost_subject_item",
            dicValueUseLabel: true
          }
        },

        {
          component_type: "input",
          label: "支出产品",
          prop: "expendProduct",
          disable: true,
          mouseOnTipUseValue:true,
          placeholder: "根据科目项选择带出"
        },
        {
          component_type: "input",
          label: "对应收入的产品名称",
          prop: "revenueProduct",
          disable: true,
          mouseOnTipUseValue:true,
          placeholder: "根据科目项选择带出"
        },
        {
          component_type: "input",
          label: "对应收入的产品实例编码（计费码）",
          prop: "revenueProductCode",
          disable: true,
          mouseOnTipUseValue:true,
          placeholder: "根据科目项选择带出"
        },
        {
          component_type:"select",
          label:"支出条件",
          prop:"expendTerms",
          inputMustFill:true,
          options:{
            dicListName:"expend_condition",
          },
        },
        {
          label: "生效时间",
          prop: "effectiveDate",
          inputMustFill: true,
          component_type: "date",
          valueFormat: "yyyy-MM-dd",
          format: "yyyy-MM-dd"
        },
        {
          label: "失效时间",
          prop: "failureDate",
          inputMustFill: true,
          component_type: "date",
          valueFormat: "yyyy-MM-dd",
          format: "yyyy-MM-dd"
        },
        {
          label: "期数",
          prop: "periods",
          component_type: "inputNumber",
          control: false,
          disable: true
        },
        {
          label: "税率（%）",
          prop: "taxRate",
          component_type: "inputNumber",
          step: 1,
          stepStrictly: true,
          min: 0,
          inputMustFill: true
        },
        {
          label: "支出含税金额（元）",
          prop: "expenditureIncludedMoney",
          component_type: "inputNumber",
          inputMustFill: true,
          precision: 3
        },
        {
          label: "每期含税金额（元）",
          prop: "taxIncludedMoney",
          component_type: "inputNumber",
          disable: true,
          precision: 3
        },
        {
          label: "每期不含税金额（元）",
          prop: "taxExclusivMoney",
          component_type: "inputNumber",
          disable: true,
          precision: 3
        },
        {
          component_type: "input",
          label: "预算编码",
          prop: "budgetCode",
          inputMustFill: false,
          span: 8
        },
        {
          component_type: "input",
          label: "订单编码",
          prop: "orderCode",
          inputMustFill: false,
          span: 8
        },
        {
          component_type:"inputNumber",
          label:"对应出账金额（元）",
          prop:"outgoingAmount",
          inputMustFill:true,
          precision: undefined,
          min:undefined,
          max:undefined,
          span:8,
        },
        {
          component_type:"inputNumber",
          label:"对应实收金额（元）",
          prop:"actualAmount",
          inputMustFill:true,
          precision: undefined,
          min:undefined,
          max:undefined,
          span:8,
        },
        ...dynamicCols,
      ]
    }
  ];
  if (planFormUseJustShow) {
    util.loop(config, (item, index) => {
      item.disable = true;
      if(item.component_type === "table"){
        util.loop(item.colNameArr,(item2,index2)=>{
          item2.component_type = "show";
        });
        item.watchDataChange = undefined;
      }
    });
  }
  return [...config];
};
//顺便获取CT科目项关系,设置全局单独字段保存
const getSubjectItemListAndSetDictCT = () => {
  let param = {};
  util
    .apiHttp({
      url: "/workflow/processBusinessManage/afterContract/getSubjectItemList",
      param: param,
      showLoading: false,
      repeatCheck: true,
      codeErrorFailCallBack: true,
      storageTime: 1000 * 60 * 60,
      failCallBack: res => {},
      completeCallBack: res => {}
    })
    .then(res => {
      console.log("账目项关系-接口返回");
      store.state.subjectItemRelationListCT = res.datas;
    });
};
//设置科目项时,关联设置CT相关的三个字段
const setSubjectItemRelationCT = ({ value, prop, changeRow, that }) => {
  if (prop === "subjectItem") {
    let relationItem = store.state["subjectItemRelationListCT"].find(item => {
      return value === item.subjectItem;
    });
    let setPropArr = [
      "expendProduct",
      "revenueProduct",
      "revenueProductCode",
      //这边后端没有传name的prop
    ];
    if (relationItem) {
      util.loop(setPropArr,(item,index)=>{
        console.log("设置账目项时,关联设置",relationItem[item]);
        that.$set(changeRow, item, relationItem[item]);
      });
    }
    else{
      util.loop(setPropArr,(item,index)=>{
        that.$set(changeRow, item, "");
      });
    }
  }
};
/* 成本计划表格 */

export default {
  getConfig
};
