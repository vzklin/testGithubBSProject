import Vue from "vue";
// import axios from 'axios'
import store from "@/store";
import router from "@/router";
import { Message, Loading } from "element-ui";
import { postAction, getAction } from "@/api/manage";
import request from "@/utils/request";
import util from "@/a_common/util";
import { listForm } from "@/api/ict-workflow/form";

const utilParam = {}; //用于本文件公用函数中重复读取判定等逻辑需要的参数存放

/* 根据流程数据特殊处理页面 */
const changePageConfigByFlow = ({ that } = {}) => {
  if (!that) return Message.error("需要传页面this值");
  if (!that.processDefinitionId) return Message.error("流程定义ID不存在");

  if (
    that.processDefinitionId &&
    that.processDefinitionId.includes("lixiangChange")
  ) {
    //项目变更
    let val = that.taskFormData;
    let taskFormJson = that.taskFormJson;
    // 退回审核时也需要显示
    // if(that.taskDefinitionKey != "projectInfoChange_start"){
    try {
      let diffPropArr = util.diffPropVal(
        val.projectInfoAfter,
        val.projectInfoBefore
      );
      if (diffPropArr.length > 0) {
        let projectInfoAfter = util.findPropBelongItem({
          obj: taskFormJson,
          findPropName: "prop",
          findPropVal: "projectInfoAfter"
        });
        let projectInfoAfter_config = projectInfoAfter.stringArr.config;

        let projectInfoAfter_config_parse = JSON.parse(projectInfoAfter_config);
        util.loop(diffPropArr, (diffProp, index) => {
          let findItem = util.findPropBelongItem({
            obj: projectInfoAfter_config_parse,
            findPropVal: diffProp
          });
          if (findItem) {
            findItem.blockClass = "redStyle";
          } else {
            return "continue";
          }
        });
        if (
          projectInfoAfter_config_parse[projectInfoAfter_config_parse.length-1].label != "提示：红色字段为已变更内容"
        ) {
          //这样做会有问题,key变动,同时又因为动态变动整体渲染顺序,同时又因为有前后两个pageInterface模块内部有相同key的组件,导致showByOtherValue值串了
          //因此改为增加在尾部//或者后续可以改成在设置配置之前追加,就不会有该问题
          projectInfoAfter_config_parse.push({
            label: "提示：红色字段为已变更内容",
            component_type: "tip",
            span: 24,
            style: "color:red;"
          });
        }
        projectInfoAfter.stringArr.config = JSON.stringify(
          projectInfoAfter_config_parse
        );
        console.warn(`转换成功`, taskFormJson);
      }
    } catch (error) {
      console.error(`设置配置时出错`, error);
    }
    // }
  }
};

const changeInputShowByOtherInputVal = ({
  otherInputVal,
  hideValArr = [],
  needHidePropArr = [],
  that, //watch中的this，指向avue-form对象
  configPropName = "taskFormJson"
} = {}) => {
  util.loop(needHidePropArr, (item, index) => {
    let findItem =
      that.findObject(that[configPropName].column, item) == -1
        ? that.findObject(that[configPropName].group, item)
        : that.findObject(that[configPropName].column, item);
    if (hideValArr.includes(otherInputVal)) {
      //值为需要隐藏input的值
      findItem.display = false;
    } else {
      findItem.display = true;
    }
  });
};

const showModuleState = ({
  flowName = "",
  forDataOld = {},
  taskFormJson = {},
  that, //watch中的this，指向avue-form对象
  callBack = () => {}
} = {}) => {
  if (flowName.includes("售前售中交接确认")) {
    // 判断是否是单一来源
    console.warn("forDataOld", forDataOld);
    console.warn("taskFormJson", taskFormJson);

    let otherInputValArray = [
      "aggregatorRecruitmentResultsFile",
      "noticeOfAwardFile",
      "screenshotOfBidAnnouncementFile"
    ];

    // 当前流程的建管模式
    let agentConstructionData = forDataOld.baseProjectInfo.agentConstruction;
    // 当前流程混合类型
    let mixTypeData = forDataOld.baseProjectInfo.mixType;

    console.warn(
      "agentConstructionData",
      agentConstructionData,
      "mixTypeData",
      mixTypeData
    );

    if (forDataOld.baseProjectInfo.biddingModel != "单一来源") {
      // 不显示客户合同

      console.warn("taskFormJson", taskFormJson);

      util.loop(taskFormJson.group, (coums, j) => {
        console.warn("组件名", coums.prop);

        var configStart = "";
        var configStart_parse = undefined;

        util.loop(coums.column, (coums, index) => {
          configStart = coums.stringArr.config;
          configStart_parse = JSON.parse(configStart);
        });

        if (coums.prop == "projectInfo") {
          // 项目信息中
          try {
            let projectInfoAfter = util.findPropBelongItem({
              obj: configStart_parse,
              findPropName: "prop",
              findPropVal: "ifCTBuild"
            });

            if (projectInfoAfter == undefined) {
              return "break";
            }

            projectInfoAfter.options.showByOtherPropAndValue = {};

            if (agentConstructionData == "2" || agentConstructionData == "3") {
              projectInfoAfter.vif = true;
            } else if (
              agentConstructionData == "4" &&
              (mixTypeData.indexOf("2") > -1 || mixTypeData.indexOf("3") > -1)
            ) {
              projectInfoAfter.vif = true;
            } else {
              projectInfoAfter.vif = false;
            }
            try {
              taskFormJson.group[j].column[0].stringArr.config = JSON.stringify(
                configStart_parse
              );
            } catch (e) {
              console.warn(e);
            }

            console.warn("taskFormJson.group[j]", taskFormJson.group[j]);
          } catch (error) {
            console.error(`设置配置时出错`, error);
          }
        } else if (coums.prop == "approvalInfo") {
          // 不显工建批复信息
          coums.display = false;
        } else if (coums.prop == "customerInfo") {
          // 不显示客户合同
          coums.display = false;
        } else if (coums.prop == "hadoverInfo") {
          //  显示合同信息5个
          coums.display = true;
        }
      });
    } else {
      // aggregatorRecruitmentResultsFile应标文件
      // noticeOfAwardFile 中标通知书
      // screenshotOfBidAnnouncementFile 中标公告截图
      // IT建设  agentConstruction
      // 混合模型  mixType

      // 当前为单一来源
      // 显示 工建批复信息 approvalInfo  客户合同 customerInfo    显示文档中的2个

      util.loop(taskFormJson.group, (coums, j) => {
        console.warn("组件名", coums.prop);

        var configStart = "";
        var configStart_parse = undefined;

        util.loop(coums.column, (coums, index) => {
          configStart = coums.stringArr.config;
          configStart_parse = JSON.parse(configStart);
        });

        if (coums.prop == "projectInfo") {
          try {
            // 删除交接文档中的一些不需要显示的文件表格
            let projectInfoAfter = util.findPropBelongItem({
              obj: configStart_parse,
              findPropName: "prop",
              findPropVal: "ifCTBuild"
            });

            if (projectInfoAfter == undefined) {
              return "break";
            }

            projectInfoAfter.options.showByOtherPropAndValue = {};

            if (agentConstructionData == "2" || agentConstructionData == "3") {
              projectInfoAfter.vif = true;
            } else if (
              agentConstructionData == "4" &&
              (mixTypeData.indexOf("2") > -1 || mixTypeData.indexOf("3") > -1)
            ) {
              projectInfoAfter.vif = true;
            } else {
              projectInfoAfter.vif = false;
            }

            try {
              taskFormJson.group[j].column[0].stringArr.config = JSON.stringify(
                configStart_parse
              );
            } catch (e) {
              console.warn(e);
            }

            console.warn("taskFormJson.group[j]", taskFormJson.group[j]);
          } catch (error) {
            console.error(`设置配置时出错`, error);
          }
        } else if (coums.prop == "approvalInfo") {
          // 工建批复信息
          // 当IT部分建设模式=自建（投资）、自建（纯成本）时展示
          // 0817修改 自建（纯成本）时不展示
          if (agentConstructionData == "0") {
            // 显示工建批复信息
            coums.display = true;
          } else if (agentConstructionData == "4") {
            // 混合类型包含自建（投资）、自建（纯成本）时展示
            // 0817修改 自建（纯成本）时不展示
            if (mixTypeData.indexOf("0") > -1) {
              // 显示工建批复信息
              coums.display = true;
            }
          } else {
            coums.display = false;
          }
        } else if (coums.prop == "customerInfo") {
          // 显示客户合同
          coums.display = true;
        } else if (coums.prop == "hadoverInfo") {
          // 交接文档特殊文件处理

          util.loop(otherInputValArray, (otherInputVal, index) => {
            try {
              // 删除交接文档中的一些不需要显示的文件表格
              let projectInfoAfter = util.findPropBelongItem({
                obj: configStart_parse,
                findPropName: "prop",
                findPropVal: otherInputVal
              });

              if (projectInfoAfter == undefined) {
                return "continue";
              }
              console.warn(
                "configStart_parse开始",
                configStart_parse,
                "删除",
                projectInfoAfter.label
              );
              configStart_parse.splice(
                configStart_parse.indexOf(projectInfoAfter),
                1
              );
              try {
                taskFormJson.group[
                  j
                ].column[0].stringArr.config = JSON.stringify(
                  configStart_parse
                );
              } catch (e) {
                console.warn(e);
              }
              console.warn("taskFormJson.group[j]", taskFormJson.group[j]);
            } catch (error) {
              console.error(`设置配置时出错`, error);
            }
          });
        }
      });
    }

    callBack(taskFormJson);
  }
};

/* 将流程Key转换成流程名称 */
const flowKeyChangeFlowName = ({ flowName = "" } = {}) => {
  let flowKey = store.state.curPageAvueForm_flowKey;
  console.warn(store.state.curPageAvueForm_flowName);

  let flowNameData = store.state.curPageAvueForm_flowName;

  let keyJsonArray = [
    {
      key: "shangji",
      value: "商机预评估"
    },
    {
      key: "shortList",
      value: "短名单比选"
    },
    {
      key: "projectBidding",
      value: "单项目公开招募"
    },
    {
      key: "lixiang",
      value: "项目立项"
    },
    {
      key: "biddingManagement",
      value: "应标"
    },
    {
      key: "planStoreDown",
      value: "方案库申请下载"
    },
    {
      key: "beforeContract",
      value: "前向合同"
    },
    {
      key: "exampleStoreDown",
      value: "案例库申请下载"
    },
    {
      key: "personalQualificationApply",
      value: "个人资质申请"
    },
    {
      key: "personalQualification",
      value: "个人资质库流程"
    },
    {
      key: "companyQualification",
      value: "公司资质申请"
    },
    {
      key: "qualificationChange",
      value: "资质申请变更"
    },
    {
      key: "qualification",
      value: "资质申请"
    },
    {
      key: "revenuePlan",
      value: "收入计划"
    },
    {
      key: "afterContract",
      value: "成本支出计划编制"
    },
    {
      key: "createSubSccount",
      value: "创建子账户"
    },
    {
      key: "revenuePlanChange",
      value: "收入计划变更"
    },
    {
      key: "afterContractChange",
      value: "支出成本计划变更"
    },
    {
      key: "beforeContractChange",
      value: "收款计划变更"
    },
    {
      key: "groupCustomerInformation",
      value: "出账集团信息确认"
    },
    {
      key: "beforeContractGathering",
      value: "前向合同收款确认"
    },
    {
      key: "projectTransfer",
      value: "项目移交"
    },
    {
      key: "postProjectEvaluation",
      value: "项目后评估"
    },
    {
      key: "inProjectEvaluation",
      value: "项目中评估"
    },
    {
      key: "lixiangChange",
      value: "项目信息变更"
    },
    {
      key: "projectOnSaleHandover",
      value: "售前售中交接确认"
    },
    {
      key: "projectPending",
      value: "项目挂起"
    },
    {
      key: "projectClosure",
      value: "项目关闭"
    },
    {
      key: "afterSaleEvaluate",
      value: "售后满意度"
    },
    {
      key: "onSaleEvaluate",
      value: "售中满意度"
    },
    {
      key: "planEvaluate",
      value: "解决方案室满意度"
    },
    {
      key: "firstCheckDelayConfirm",
      value: "售中管理-初验进度确认"
    }
  ];

  if (flowKey != "" && flowKey != undefined) {
    if(flowKey.includes(":")){
      flowKey = flowKey.split(":")[0];
    }
    util.loop(keyJsonArray, (items, index) => {
      if (flowKey === items.key) {
        flowNameData = items.value;
        return "break";
      }
    });
  }
  console.warn("转换流程名称", flowKey, flowNameData);
  return flowNameData;
};

/* 将流程节点Key转换成流程节点名称 */
const taskKeyChangeTaskName = ({ taskName = "" } = {}) => {
  let taskKey = store.state.curPageAvueForm_taskKey;
  console.warn("taskKeyChangeTaskName:", store.state.curPageAvueForm_taskName);

  if (taskKey != "" && taskKey != undefined) {
    switch (taskKey) {
      /* ---------短名单 */
      case "Activity_09buj5y":
        taskName = "发起比选";
        break;
      case "Activity_1gpb105":
        taskName = "短名单厂家报名";
        break;
      case "Activity_1onl01w":
        taskName = "比选方案应答";
        break;
      case "Activity_1vrn5bu":
        taskName = "谈判结果录入";
        break;
      case "Activity_1aeqxo7":
        taskName = "抽取专家";
        break;
      case "Activity_0m53357":
        taskName = "应答方案初审";
        break;
      case "Activity_1aj7b0m":
        taskName = "应答文件详审";
        break;
      case "短名单查看":
        taskName = "短名单查看";
        break;

      /* ---单项目公开招募 */

      case "Activity_0uxmes7":
        taskName = "发起采购公告申请";
        break;
      case "Activity_1kj2rsg":
        taskName = "采购公告审核";
        break;
      case "Activity_0yy2lh9":
        taskName = "短名单管理员审核";
        break;
      case "Activity_1btsc0p":
        taskName = "挂公告";
        break;
      case "Activity_0vn0zzk":
        taskName = "报名厂家维护";
        break;
      case "Activity_13wlgc4":
        taskName = "投标单位应答";
        break;
      case "Activity_13wlgc4":
        taskName = "投标单位应答";
        break;
      case "Activity_05fi7vf":
        taskName = "谈判结果录入";
        break;
      case "Activity_019bc8t":
        taskName = "抽取专家";
        break;
      case "Activity_06xrd6d":
        taskName = "投标应答方案初审";
        break;
      case "Activity_1hbzenp":
        taskName = "应答文件详审";
        break;
      case "单项目公开招募查看":
        taskName = "单项目公开招募查看";
        break;

      // 应标
      case "Activity_1btw70t":
        taskName = "录入应标结果";
        break;
      case "Activity_0p2e8hr":
        taskName = "制定追缴保证金计划";
        break;
      case "Activity_0cmcxzf":
        taskName = "填写回款结果";
        break;

      //个人资质
      case "Activity_0nc8cys":
        taskName = "资质发起申请";
        break;
      default:
        taskName = store.state.curPageAvueForm_taskName;
        break;
    }
  } else {
    taskName = store.state.curPageAvueForm_taskName;
  }
  return taskName;
};

// 处理特殊数据
const solveSpecialData = ({ param = "", json = {} } = {}) => {
  if (param == "onsale") {
    // 工建批复信息
    let constructionApprovalInfo = {
      projectApprovalType: json.baseProjectInfo.projectApprovalType,
      fileNumber: json.baseProjectInfo.fileNumber,
      misNumber: json.baseProjectInfo.misNumber,
      constructionsUnit: json.baseProjectInfo.constructionsUnit,
      approvalAmount: json.baseProjectInfo.approvalAmount,
      misName: json.baseProjectInfo.misName
    };

    // 客户合同
    let customerContract = {
      personalizedContract: json.baseProjectInfo.personalizedContract,
      standardizedContract: json.baseProjectInfo.standardizedContract,
      frameworkAgreement: json.baseProjectInfo.frameworkAgreement,
      beforeContractNum: json.baseProjectInfo.beforeContractNum,
      beforeContractName: json.baseProjectInfo.beforeContractName,
      ownerUnit: json.baseProjectInfo.ownerUnit,
      signContractDate: json.baseProjectInfo.signContractDate,
      contractEfficientDate: json.baseProjectInfo.contractEfficientDate,
      contractDisabledDate: json.baseProjectInfo.contractDisabledDate,
      signMoney: json.baseProjectInfo.signMoney,
      taxInclusiveMoney: json.baseProjectInfo.taxInclusiveMoney,
      addedValueTaxMoney: json.baseProjectInfo.addedValueTaxMoney,
      purchaseMethod: json.baseProjectInfo.purchaseMethod,
      seleStandardizedContract: json.baseProjectInfo.seleStandardizedContract,
      seleFrameworkAgreement: json.baseProjectInfo.seleFrameworkAgreement,
      beforeContractAppendixFiles:
        json.baseProjectInfo.beforeContractAppendixFiles
    };

    // 交接文档

    let handoverDocument = {
      customerContractFile: json.customerContractFile,
      aggregatorRecruitmentResultsFile: json.aggregatorRecruitmentResultsFile,
      noticeOfAwardFile: json.noticeOfAwardFile,
      screenshotOfBidAnnouncementFile: json.screenshotOfBidAnnouncementFile,
      decisionMakingNotesFile: json.decisionMakingNotesFile,
      technicalProposalFile: json.technicalProposalFile,
      businessPlanFile: json.businessPlanFile
    };

    json.constructionApprovalInfo = constructionApprovalInfo;
    json.customerContract = customerContract;
    json.handoverDocument = handoverDocument;

    console.warn("json", json);
  }

  return json;
};

const emptyCurPageAvueFormData = ({ storeStateObjReplace } = {}) => {
  //清空curPageAvueForm相关数据
  let storeStateObj = storeStateObjReplace ?? store.state;
  console.warn("清空curPageAvueForm相关数据");
  if (storeStateObjReplace) {
    console.warn(
      "该页面使用单独的storeStateObjReplace,因此清空对象变更为该对象"
    );
  } else {
    
  }
  storeStateObj.curPageAvueForm_inputData = {}; //当前页面表单的数据
  storeStateObj.curPageAvueForm_config = {}; //当前页面表单的配置
  storeStateObj.curPageAvueForm_flowKey = ""; //流程key
  storeStateObj.curPageAvueForm_flowId = ""; //流程Id，后端接口返回，非流程列表中定义的流程key
  storeStateObj.curPageAvueForm_flowName = ""; //流程中文名
  storeStateObj.curPageAvueForm_taskKey = ""; //流程当前的步骤KEY
  storeStateObj.curPageAvueForm_taskName = ""; //流程当前的步骤中文名
  storeStateObj.curPageAvueForm_version = ""; //当前流程的版本号
  storeStateObj.curPageAvueForm_currentVersion = ""; //当前流程的版本号（商机）
  storeStateObj.curPageAvueForm_process_version = ""; //当前流程图版本号
  storeStateObj.curPageAvueForm_formInputRuleFailObj = {}; //当前页面表单的内部验证对象数据
  storeStateObj.curPageAvueForm_formDataByApi = {}; //formData接口返回的res.data
  storeStateObj.curPageAvueForm_originInputData = {}; //当前页面表单未修改前的原始数据,应在获取表单数据接口的同时设置
};
//获取表单设计内容
const getFlowInitData = ({
  flowKey = "",
  showLoading = false,
  success = () => {}
} = {}) => {
  console.log("方法-getFlowInitData获取表单设计内容");
  if (showLoading) {
    var showLoadingIns = util.showLoading({
      title: "请稍候",
      duration: 6000,
      mask: false,
      afterDisappear: () => {}
    });
  }
  //延迟300ms,先等待加载mask生成
  setTimeout(() => {
    listForm({
      pageNum: 1,
      pageSize: 10,
      keyNo: flowKey,
      formName: null
    }).then(response => {
      let flowInitData;
      try {
        flowInitData = JSON.parse(response.rows[0].formData);
      } catch (error) {
        console.error(`转换表单字符串时出错`, error);
      }
      success(flowInitData, showLoadingIns);
    });
  }, 300);
};
//获取流程id
const getProcessId = ({
  that = null,
  keyProp = "processDefinitionKey",
  idProp = "processDefinitionId"
}) => {
  var data = {
    processDefinitionCategory: "",
    latestVersion: "true",
    pageNum: 1,
    pageSize: 10,
    id: undefined,
    name: undefined,
    key: undefined,
    suspended: undefined,
    processDefinitionKey: that[keyProp]
  };

  getAction("/workflow/flowable/processInstance/getDefineList", data).then(
    res => {
      if (res.count === 0) {
        Message.info("查无可发起的流程");
        return;
      }
      that[idProp] = res.items[0].id;
    }
  );
};
//设置avue基本控件禁用
const changeAvueFormBasicDisable = ({ that = null, taskFormJson }) => {
  if (taskFormJson) {
    //在group中
    if (taskFormJson.hasOwnProperty("group")) {
      util.loop(taskFormJson.group, item => {
        util.loop(item.column, item2 => {
          if (item2.required == true) {
            item2.disabled = true;
          }
        });
      });
    }

    if (taskFormJson.hasOwnProperty("column")) {
      util.loop(taskFormJson.column, item => {
        if (item.required == true) {
          item.disabled = true;
        }
      });
    }
  }
};

const checkoutRevenueCollectionPlanPreparation = ({
  that = null,
  formdata = {}
}) => {
  let contractInformationList = [];
  let booleanState = true;
  formdata.contractInformationList
    ? (contractInformationList = formdata.contractInformationList)
    : "";

  if (
    contractInformationList == undefined ||
    contractInformationList.length == 0
  ) {
    util.showToast(`请至少新增一条合同数据！`, {
      type: "error"
    });
    booleanState = false;
  }

  util.loop(contractInformationList, (item, index) => {
    // 一条合同信息
    formdata["before" + (index + 1)] = item;
    //判断是否有数据

    if (
      (!item.beforeContractCycleCollectMoney &&
        !item.beforeContractAcyclicCollectMoney) ||
      (item.beforeContractCycleCollectMoney &&
        item.beforeContractAcyclicCollectMoney &&
        item.beforeContractCycleCollectMoney.length +
          item.beforeContractAcyclicCollectMoney.length ==
          0)
    ) {
      util.showToast(`合同` + (index + 1) + `收款计划请至少填入一条数据！`, {
        type: "error"
      });
      booleanState = false;
      return "break";
    }

    // 校验‘收款含税金额（元）’之和
    let collectMoneyData = 0;
    util.loop(item.beforeContractCycleCollectMoney, (item2, index2) => {
      item2.taxIncludedMoney
        ? (collectMoneyData += Number(item2.taxIncludedMoney))
        : "";
    });
    let ayclicCollectMoneyData = 0;
    util.loop(item.beforeContractAcyclicCollectMoney, (item2, index2) => {
      // item2.taxIncludedMoney
      //   ? item2.periods
      //     ? (ayclicCollectMoneyData =
      //         ayclicCollectMoneyData +
      //         Number(item2.taxIncludedMoney) * item2.periods)
      //     : ""
      //   : "";
      ayclicCollectMoneyData += Number(item2.collectionTaxIncludedMoney);
    });
    // 计算收款含税金额（元）
    let taxIncludedMoneyCompare =
      Number(ayclicCollectMoneyData) + Number(collectMoneyData);

    if (item.taxInclusiveMoney && item.frameworkAgreement) {
      console.warn(
        "签订框架协议选择",
        item.taxInclusiveMoney,
        taxIncludedMoneyCompare
      );

      var num1 = taxIncludedMoneyCompare.toFixed(7);
      var num2 = (Number(item.taxInclusiveMoney) * 10000).toFixed(7);

      if (item.frameworkAgreement == "0" && Number(num1) > Number(num2)) {
        util.showToast(
          `合同` +
            (index + 1) +
            `收款计划含税总金额高于合同含税总金额，请重新填入！`,
          {
            type: "error"
          }
        );
        booleanState = false;
        return "break";
      } else if (
        item.frameworkAgreement == "1" &&
        Number(num1) != Number(num2)
      ) {
        util.showToast(
          `合同` +
            (index + 1) +
            `收款计划含税总金额需等于合同含税总金额，请重新填入！`,
          {
            type: "error"
          }
        );
        booleanState = false;
        return "break";
      }
    }

    //判断是否有数据
    if (
      (!item.revenuePlanDisposable &&
        !item.revenuePlanMonth &&
        !item.ictSpRevenueCtDisposable &&
        !item.ictSpRevenueCtMonth) ||
      (item.revenuePlanDisposable &&
        item.revenuePlanMonth &&
        item.ictSpRevenueCtDisposable &&
        item.ictSpRevenueCtMonth &&
        item.revenuePlanDisposable.length +
          item.revenuePlanMonth.length +
          item.ictSpRevenueCtDisposable.length +
          item.ictSpRevenueCtMonth.length ==
          0)
    ) {
      util.showToast(`合同` + (index + 1) + `收入计划请至少填入一条数据！`, {
        type: "error"
      });
      booleanState = false;
      return "break";
    }

    // 校验‘收入计划金额合计’之和
    let revenuePlanDisposableIT = 0;
    util.loop(item.revenuePlanDisposable, (item2, index2) => {
      item2.taxIncludedMoney
        ? (revenuePlanDisposableIT += Number(item2.taxIncludedMoney))
        : "";
    });
    let revenuePlanMonthIT = 0;
    util.loop(item.revenuePlanMonth, (item2, index2) => {
      item2.taxIncludTotalMoney
        ? (revenuePlanMonthIT += Number(item2.taxIncludTotalMoney))
        : "";
    });

    let revenuePlanDisposableCT = 0;
    util.loop(item.ictSpRevenueCtDisposable, (item2, index2) => {
      item2.taxIncludedMoney
        ? (revenuePlanDisposableCT += Number(item2.taxIncludedMoney))
        : "";
    });
    let revenuePlanMonthCT = 0;
    util.loop(item.ictSpRevenueCtMonth, (item2, index2) => {
      item2.taxIncludTotalMoney
        ? (revenuePlanMonthCT += Number(item2.taxIncludTotalMoney))
        : "";
    });

    // 计算收入计划含税金额（元）
    let revenuePlanMoneyCompare =
      Number(revenuePlanDisposableIT) +
      Number(revenuePlanMonthIT) +
      Number(revenuePlanDisposableCT) +
      Number(revenuePlanMonthCT);

    var num3 = revenuePlanMoneyCompare.toFixed(7);
    var num4 = (Number(item.taxInclusiveMoney) * 10000).toFixed(7);
    if (Number(num3) != Number(num4)) {
      util.showToast(
        `合同` +
          (index + 1) +
          `收入计划总金额（IT+CT）不等于合同含税总金额，请重新填入！`,
        {
          type: "error"
        }
      );
      booleanState = false;
      return "break";
    }
  });

  return booleanState;
};

//获取批量下载需要的拼接ID
const getFileIds = ({
  row = {}, //行数据对象
  idProp = "id",
  filePropArr = [] //需要拼接的字段
} = {}) => {
  let fileIds = "";
  let filesLength = 0;
  util.loop(filePropArr, (item_file, index_file) => {
    if (Array.isArray(row[item_file])) {
      let sumStr = row[item_file].reduce((sum, item, index, arr) => {
        return sum + item[idProp] + (index !== arr.length - 1 ? "," : "");
      }, "");
      fileIds += sumStr + (index_file !== filePropArr.length - 1 ? "," : "");
      filesLength += row[item_file].length;
    }
  });
  row.filesLength = filesLength;
  row.fileIds = fileIds;
};

//批量下载拼接ID
const listMultiDownload = ({
  idProp = "fileIds",
  row = null,
  fileNamePrefix="",
  that = null,
} = {}) => {
  if(!row)return util.showToast(`行数据为空`,{type:"error"});
  let ids=row[idProp];//fileIds在获取列表成功时生成
  let dataJson = {
    id: ids,
    fileName: fileNamePrefix +"-附件",
  };
  util.showToast(`处理中，请稍候`);
  util.downloadFile({
    param: dataJson,
    fileName: dataJson.fileName,
    fileType: "zip",
    queryAddr: "/ict-informationRSC/sysAccessoryFile/downloadByIds",
    showLoading:true,
    multiDownload:true,
  });
};

export default {
  changePageConfigByFlow,
  changeInputShowByOtherInputVal,
  showModuleState,
  flowKeyChangeFlowName,
  taskKeyChangeTaskName,
  solveSpecialData,
  emptyCurPageAvueFormData,
  getFlowInitData,
  getProcessId,
  changeAvueFormBasicDisable,
  checkoutRevenueCollectionPlanPreparation,
  getFileIds,
  listMultiDownload,
};
