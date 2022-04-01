import React, { Component, Fragment } from 'react';
import { actions, connect } from 'mirrorx';
import {
  toFixedColumns,
  doReceiptCheck,
  testDateRange,
  testDateRange2,
  cancelSeeDoctor,
  cancelReadCard,
  doReceiptCheckType5,
  hardwareCardCheckreading,
  doHardwareDispenserCheckstate,
  handlePatientNameDesensitization,
  noPassByNameExart,
} from '../lib/util';
import Card from '../component/Card';
import Button from '../component/base/Button';
import IndexNotice from '../component/indexPage/IndexNotice';
import TodoDrawer from '../component/indexPage/TodoDrawer';
import qs from 'qs';
import Notice from '../component/base/Notice';
import { changeMonitorView } from '../lib/monitor';
import Loading from '../component/base/Loading';
// import '../component/less/4_1_0-index-page-zjp4-2-0.css'
// import thirdPay from '../lib/thirdPay'
import Tips from '../component/Tips';
import UserInfoScanner from '../component/base/UserInfoScanner';
import iconIndexMap from '../../src/lib/iconIndexMap';
import iconIndexSecondMap from '../../src/lib/iconIndexSecondMap';
import iconIndexMapUseTheme from '../../src/lib/iconIndexMapUseTheme';
import iconIndexSecondMapUseTheme from '../../src/lib/iconIndexSecondMapUseTheme';
import IndexNotice410 from '../component/indexPage/IndexNotice410';
import UserInfoUtil from '../lib/util.userInfo';
import UserElectronicCardScanner from '../component/base/UserElectronicCardScanner';
import moment from 'moment';
import api from '../service/gateway';
import { isArray } from 'util';
import SignPage from '../component/base/SignPage';
import HardwareMonitor from '../lib/hardwareMonitor';
import HardwareMonitorSlot from '../component/base/HardwareMonitorSlot';
import IndexPageZJP4_0_0HandlerBase from './IndexPageZJP4_0_0Handler';
import IndexReadingPage from './IndexReadingPage';
import eventBus from '../lib/eventBus';
import SubPageModal from '../../src/useHook/SubPageModal';
import MoreFunctions from '../../src/component/base/MoreFunctions';

window.Notice = Notice;

class IndexPage extends Component {
  constructor(props) {
    super(props);
    this.handler = new IndexPageZJP4_0_0HandlerBase();
    const { corpInfo = {} } = props.config;
    const { hospitalId = '' } = corpInfo;
    this.hospitalId = hospitalId || '';
    this.state = {
      drawerVisible: false,
      forcePayCompleted: false,
      showTips: false, //显示弹框
      setFunc: {}, //传递参数
      click: false, //判断弹框点击事件
      drawerFlag: false,
      forcePay: false, //湖州中心医院 强制支付缴费单
      unPayPayment: false,
      unPayRecords: false,
      isGrayMask: false, //默认不置灰 优先处理缴费单后处理预约记录
      queryUserInfoLoading: false,
      isCompleteUserInfo: true, //默认显示强制待办 需要补充信息时暂时隐藏
      secondFuncList: [], //次级功能
      showSecondList: false, //显示更多功能栏
      useType4_1_0: props.config.useType4_1_0 || false, //版本控制
      printExeStatus: false, //激光打印机状态
      todoDrawerJudge: false, //待办控制
      moreFunctionsCard: false, //更多功能模态框
    };
    this.Style = [];
    this.bench = [];
    this.timer = null;
    this.mainStyleList = [];
    const { indexLoopVersion2 = false } = props.config;
    if (indexLoopVersion2 && !window.userInfoUtil) {
      window.userInfoUtil = new UserInfoUtil();
    }
  }

  /**
   * 设置屏幕底部副按钮排列
   * @param {*} config 整体配置文件
   */
  setSecondFuncList = (config = {}) => {
    const { indexPage = {} } = config;
    let secondFunc = [];
    let functionArray = indexPage['function'];
    if (!isArray(functionArray)) {
      functionArray = new Array(functionArray);
    }
    secondFunc =
      functionArray
        .map((item, key) => item)
        .filter((item) => item.location == undefined) || {}; //过滤没有location的func 返回func
    this.setState({
      secondFuncList: secondFunc,
    });
  };

  /**
   * 设置轮询时 查询病人信息动画
   */
  setAnimation = (queryParams, animationList) => {
    const { indexLoopVersion2Config = {} } = this.props.config;
    const { cardType = '' } = queryParams;
    let key = `cardType-${cardType}`;
    if (key in indexLoopVersion2Config[animationList]) {
      let animation =
        indexLoopVersion2Config[animationList][key].animation || '';
      let animationTitle =
        indexLoopVersion2Config[animationList][key].animationTitle || '';
      this.setState({
        animation,
        animationTitle,
      });
    }
  };

  resetAnimation = () => {
    this.setState({
      animation: '',
    });
  };

  componentWillUnmount() {
    const { useHardwareMonitor = false } = this.props.config;
    if (useHardwareMonitor) {
      // 去掉硬件检测查询的定时器
      this.hardwareMonitor.destory();
    }
    // 如页面变更 清除定时器
    window.userInfoUtil.clearOverTimer();
    !!this.indexLoopTimer && clearTimeout(this.indexLoopTimer);
    actions.store.setGlobalLoading(false);
    this.timer && clearInterval(this.timer);
    window.timer && clearInterval(window.timer);
    actions.store.setCanPrint();
    this.timer = null;
    window.timer = null;
    actions.device.cancelPending();
    actions.polling.setGettingUserInfo(false);
    actions.polling.setDoWhile(true);
    this.setState({
      checkoutLoading: false,
    });
    const { useLocalServiceVersion2 = false } = this.props.config;
    if (useLocalServiceVersion2) {
      // 2020.08.10 版本 本地服务
      cancelReadCard(); // 取消读卡
      return;
    }
  }

  changeConfigXml = (unionId = '', corpId = '', extend = '') => {
    let urlParam = '';
    if (!!unionId && !!corpId) {
      urlParam = `${window.deviceType}-${unionId}-${corpId}`;
    }
    if (!!unionId && !!corpId && !!extend) {
      urlParam = `${window.deviceType}-${unionId}-${corpId}-${extend}`;
    }
    return actions.config.getConfig(urlParam);
  };

  // doWhile = true; // 是否开始轮询读卡
  // timer = null;
  // gettingInfo = false; // 是否正在获取用户信息
  // hasGetPatientInfo = false; // 有无用户信息 patientId

  timer = null;
  ForcePayFor1040 = () => {
    const {
      unPayRecords = false,
      unPayPayment = false,
      isGrayMask = false,
    } = this.state;
    return (
      <div className='indexpage-force-pay'>
        <div className='indexpage-force-pay-content'>
          <div className='indexpage-force-pay-title'>待办理项</div>
          <div className='indexpage-force-pay-button'>
            {unPayRecords && (
              <button
                onClick={() => this.recordsClick()}
                className={`indexpage-force-pay-records ${
                  isGrayMask ? 'indexpage-force-pay-records-gray' : ''
                }`}
              >
                预约记录
                <div className='force-pay-info-text-confirm'>点击确认</div>
              </button>
            )}
            {unPayPayment && (
              <button
                onClick={() => this.paymentClick()}
                className={`indexpage-force-pay-payment`}
              >
                医疗缴费
                <div className='force-pay-info-text-confirm'>点击确认</div>
              </button>
            )}
          </div>
          <Button
            className='indexpage-force-pay-exitCard'
            onTouchEnd={this.handleCardCheckout.bind(this)}
          >
            <pre>退 卡</pre>
          </Button>
        </div>
      </div>
    );
  };

  /**
   * 全局缓存状态 在回到首页时 初始化
   */
  inital = () => {
    if (!!document.getElementById('_iotGatewayPay')) {
      document.body.removeChild(document.getElementById('_iotGatewayPay'));
    }
    window.faceContextId = '';
    actions.payment.setPaymentType('');
    actions.search.setSearchPayType('');
    actions.payment.setLeadAddress('');
    actions.payment.setUseWaitBillFor703(false);
    actions.payment.setPreBalanceBillParams(null); // 预结算前 清空参数 防止缓存
    actions.payment.setPreBalanceBill([]); // 清空预结算返回 防止缓存
    actions.registration.setMedicalType('');
    actions.registration.setLoading({ unLockSource: false });
    actions.creditPay.inital();
    actions.store.needReferral(false);
    actions.store.setAptArea(''); // 清空院区数据 - 浙江省中使用
    actions.store.setStep(0); // 重置侧边栏进度

    // 医技预约 初始化 start
    actions.medicalTechnology.setPatientType(''); // 清空 住院/门诊/体检的 病人类别
    actions.medicalTechnology.setDefaultCurrentAreaCode(); // 默认开单院区
    actions.medicalTechnology.setDefaultCurrentAppointArea(); // 默认预约院区
    // 医技预约 初始化 end
    //青岛妇儿 缓存预约信息 start
    actions.store.setAptSelectedStatus('');
    //青岛妇儿 缓存预约信息 end
    actions.device.cancelPending();
    Notice.hide();
    actions.payment.setTabList([]); // 宁夏大病进度列表数据清空
    actions.store.setGlobalLoading(false);
    actions.store.clearReceiptCache(); // 清空缓存的凭条数据
    actions.store.doClearReceiptCacheForRegistrationOrTakeRegNo(); // 清空缓存的凭条数据
    // 自助入院信息清空
    actions.inHosSelf.clearInHosUser();
    window.cardType24Code = ''; // 清空缓存的用户电子健康码
    // this.thirdPay = new thirdPay()
    // console.log(this.thirdPay)
    // this.thirdPay.clearQueryTimer()
    // 宜宾四院支付医保卡信息清空
    actions.store.setMedicalCardInfo({});
    // 清空住院病人查询的参数缓存
    actions.inHos.setQueryUserInfoParams({});
    // 首页清除代付卡信息
    actions.deviceExtra.setCardReadResult({});
    // 清除预处理信息
    actions.pay.setPreProcess({});
    actions.pay.setQueryOrderStatus({});
    // 清空缓存的充值类型  store.type
    actions.store.setSelectType('');
    // 清空缴费的 extend 信息
    actions.payment.setExtendWait('');
    actions.payment.setExtendPre('');
    actions.payment.doSetRowSelection({
      selectedRows: [],
      selectedRowKeys: [],
    });
    // 重置选择的建卡类型 setupType
    actions.store.saveYbInfoByLastTime({});
    actions.docCard.doSetSetupType({ setupType: '1' });
    actions.docCard.doSetSetupCardType({ setupCardType: '' });
    actions.cardChecker.setPwdVal('');
    actions.cardChecker.setPwdValExtra('');
    actions.store.setSelectedDoct({});
    actions.store.setInHosAction('');
    window.cardType24Code = ''; // 清空缓存的用户电子健康码
    actions.polling.setDoWhile(true);
    actions.polling.setGettingUserInfo(false);
    actions.store.setRegMode('');
    actions.store.setDocUser({});
    actions.store.setDate('');
    actions.store.setNumber({});
    actions.store.setSlideList([]);
    actions.store.setSlideListCache([]);
    actions.registration.setDocts([]);
    actions.payAfter.clearUser();
    actions.inHos.doSetInputCash(0);
    actions.store.setCompleteUserPhone(false);
    actions.store.setCompleteUserIdNo(false);
    actions.store.setCompleteUserIdNoByReader(false);
    actions.store.setAutoDocByUserPhone(false);
    actions.store.setPhoneNo('');
    actions.store.setIdNo('');
    actions.step.setNext('');
    actions.store.setReceiptInfo({ printTitle: '正在打印凭条...' });
    // 进入页面时 清除扫码暂存的读卡数据
    actions.scan.clearCardInfo();
    // 重置当前病人信息查询为 门诊病人
    actions.store.doSetCurrentQueryType({
      currentQueryType: '1',
    });
    // 重置查询缴费单接口是否结算状态
    actions.search.setSearchPayType('');
    // 重置科室查询接口类型
    actions.search.setInterfaceType('');
    actions.search.setRemainSourceType(''); // 重置剩余号源查询类型
    actions.step.setModule(''); // 重置当前模块类型
    actions.store.funcSelected({});
    actions.store.setCompleteUserInfoNone();
  };

  // 监控模块
  initalMonitor = () => {
    setTimeout(() => {
      // 监控平台对接 /ytmonitor/gateway.do
      changeMonitorView();
    });
    // 维护模式 添加
    // 自助机自带功能
    let { maintenanceMode = false, maintenanceModeFrom = '' } =
      this.props.store;
    if (maintenanceMode) {
      actions.routing.push(`/maintenanceMode?from=${maintenanceModeFrom}`);
    }
  };

  // 其他医院配置文件家在 - 弃用， 方法保留
  handleChangeConfigXml = () => {
    if (!!this.unionId && !!this.corpId) {
      this.changeConfigXml(this.unionId, this.corpId, this.extend);
    }
  };

  recordsClick = () => {
    if (this.state.isGrayMask) {
      Notice.alert({
        content: '请优先处理医疗缴费清单',
        duration: 5000,
      });
      return;
    }
    actions.routing.push('/number/aptRecords?regMode=1&type=for1040');
  };

  paymentClick = () => {
    actions.routing.push('/payment/seriousIllnessFor1040');
  };

  // 电子卡等
  elecCardList = [
    '1',
    '16', // 身份证id
    '17', // 市电子社保卡
    '18', // 省电子社保卡
    '24', // 电子健康卡
    '99', // 登记号
    '7', // 三码合一
  ];

  // 病人信息清空处理
  handleUserClear = () => {
    const { indexLoopVersion2 = false } = this.props.config;
    // 自动卡识别不主动清除病人信息 / 住院病人信息
    if (indexLoopVersion2) {
      window.userInfoUtil.setOverTimer({}); // 清除数据的定时器
      return;
    }

    // 清除住院病人信息
    actions.inHos.clearUser();
    actions.store.setSearchPatientId('');
    actions.store.setPatientId('');

    const {
      removeUserInfoIndex = false,
      indexUseType2And10 = false,
      indexReadingCard = false,
      removeUserInfoOnlyForIndex = false,
      removeCardInfoOnlyForIndex = false,
      isDBCardReaderAlone = true,
      autoExitCard = false,
      cardType2WithExit = false,
      cardType10WithExit = false,
      cardType11WithExit = false,
    } = this.props.config;
    const { cardInfo = {} } = this.props.device;
    const { cardType = '' } = cardInfo;
    if (
      !!removeUserInfoIndex ||
      (!!cardType && this.elecCardList.indexOf(cardType.toString()) > -1)
    ) {
      // 903医院首页清空用户信息
      actions.user.clearUser();
      window.count = 0;
      actions.device.setCardReadResult({});
    }
    if (!!removeUserInfoOnlyForIndex) {
      // 如返回首页 会清空用户信息 则启用
      actions.user.clearUser();
      window.count = 0;
    }
  };

  componentWillReceiveProps(nextProps) {
    let { config: currentConfig = {} } = this.props;
    let { config: nextConfig = {} } = nextProps;
    if (
      'indexLoopVersion2' in currentConfig &&
      'indexLoopVersion2' in nextConfig &&
      currentConfig.indexLoopVersion2 !== nextConfig.indexLoopVersion2 &&
      nextConfig.indexLoopVersion2 === false
    ) {
      // 是否轮询配置变更 - 去掉轮询定时器
      this.timer && clearInterval(this.timer);
      this.timer = null;
    }

    const { useType4_1_0 = false, _timeStamp: nextTimeStamp = '' } =
      nextProps.config;
    // _timeStamp 表示 当前配置文件版本的时间戳
    try {
      const { _timeStamp: curTimeStamp = '' } = this.props.config;
      if (useType4_1_0 && curTimeStamp !== nextTimeStamp) {
        // 配置文件版本不一致时 进行合并
        console.log('580首页重绘');
        this.Style = this.renderStyle(nextProps.config);
        this.mainStyleList = this.renderMainStyle(nextProps.config);
        this.setSecondFuncList(nextProps.config);
      }
    } catch (e) {
      console.error(
        'Error in indexPage.zjp_v4_0_0.js componentWillReceiveProps'
      );
    }
  }

  async componentDidMount() {
    const {
      useType4_1_0 = false,
      useHardwareMonitor = false,
      useAsr = false,
    } = this.props.config;
    const { info = {} } = this.props.user;

    if (useAsr && !!window.asrSocketUtil) {
      window.asrSocketUtil.exit();
    }

    cancelSeeDoctor(); // 2020.10.17 添加 新冠开单作废逻辑
    // 缓存数据等重置
    this.inital();
    // 监控模块
    this.initalMonitor();
    //激光打印流程优化
    this.printExeOptimization();

    // 2021.02.24 硬件检测 start
    if (useHardwareMonitor) {
      this.hardwareMonitor = new HardwareMonitor();
      this.hardwareMonitor.init();
    }

    if (useType4_1_0) {
      this.Style = this.renderStyle(this.props.config);
      this.mainStyleList = this.renderMainStyle(this.props.config);
      // 2020.10.22 修改 从 constructor 中改为 放到  componentDidMount
      this.setSecondFuncList(this.props.config);
    }
    const { cardInfo: cardInfoExtra = {} } = this.props.deviceExtra;
    const { cardNo: cardNoExtra = '', cardType: cardTypeExtra = '' } =
      cardInfoExtra;
    if (cardTypeExtra) {
      actions.user.getCheckoutCardExtra({
        cardNo: cardNoExtra,
        cardType: cardTypeExtra,
      });
    }
    const {
      removeUserInfoIndex = false,
      indexUseType2And10 = false,
      indexReadingCard = false,
      removeUserInfoOnlyForIndex = false,
      removeCardInfoOnlyForIndex = false,
      isDBCardReaderAlone = true,
      autoExitCard = false,
      cardType2WithExit = false,
      cardType10WithExit = false,
      cardType11WithExit = false,
      useForcePayFor580 = false,
    } = this.props.config;
    const { cardInfo = {} } = this.props.device;
    const { isCompleteUserInfo = true } = this.state;
    // 如果为 扫码的  诊疗卡/社保卡/身份证 进入功能页时，清空信息
    const { isQrCode = false } = cardInfo;
    const { cardType = '' } = cardInfo;
    if (
      isQrCode ||
      !cardType ||
      cardType == 1 ||
      cardType == 16 ||
      ['54', '55'].includes(String(cardType))
    ) {
      // 电子卡等 返回首页时 自动清空 个人信息
      actions.user.clearUser(); // 清除门诊病人信息
      actions.inHos.clearUser(); // 清除住院病人信息
      window.count = 0;
      actions.device.setCardReadResult({}); // 清除读卡器信息
      window.userInfoUtil && window.userInfoUtil.init();
    }
    this.setState({ todoDrawerJudge: true }); // 确保待办数据接口调用顺序
    if (
      ['345', '261', '346', '344', '341'].includes(String(window.hospitalId))
    ) {
      //检测到卡信息 弹框提示
      const { cardInfo = {} } = this.props.device;
      if (
        !autoExitCard &&
        Object.keys(cardInfo).length > 0 &&
        cardInfo.isQrCode != '1' &&
        ['17', '18', '24', '54', '20', '1'].includes(
          String(cardInfo.cardType)
        ) === false // 不为电子卡时
      ) {
        Notice.confirm({
          content: '检测到您的卡信息，是否立即退卡',
          duration: 10000,
          cancelBtnText: '否',
          successBtnText: '立即退卡',
          onClose: () => {
            Notice.hide();
          },
          onSuccess: async () => {
            await actions.user.getCheckoutCard({
              cardType: cardInfo.cardType || '',
            });
          },
        });
      }
    }
    if (!!removeCardInfoOnlyForIndex) {
      // 适用于 所有读卡方式 均为 半插的
      actions.device.setCardReadResult({});
    }
    if (!isDBCardReaderAlone) {
      const { cardInfo = {} } = this.props.device;
      const { cardType = '' } = cardInfo;
      if (cardType == 2) {
        actions.user
          .getCheckoutCard({ cardType })
          .then((res) => res)
          .catch((res) => res);
      }
    }
    if (!cardType10WithExit && cardType == 10) {
      // 社保卡为半插时  首页清空读卡器中信息 ，防止出错
      // actions.device.setCardReadResult({});
      actions.user.getCheckoutCard();
    }
    if (!cardType11WithExit && cardType == 11) {
      // 社保卡为半插时  首页清空读卡器中信息 ，防止出错
      // actions.device.setCardReadResult({});
      actions.user.getCheckoutCard();
    }
    this.handleUserClear();
    if (
      ['1040', '1045'].includes(String(window.hospitalId)) &&
      useForcePayFor580 &&
      isCompleteUserInfo &&
      !!info.patientId
    ) {
      actions.store.setGlobalLoading(true);
      const res1 = await actions.jhRegRecord.getJhRecordList({
        medDate: moment().format('YYYY-MM-DD'),
      });
      const res = await actions.payment.getWaitBalanceBillList({
        cardNo: info.cardNo || cardInfo.cardNo || '',
      });
      actions.store.setGlobalLoading(false);
      if ((!!res && res.success) || (!!res1 && res1.success)) {
        //获取病人信息时弹框
        this.setState({
          forcePay: true,
          forcePayCompleted: true,
        });
        let showPayment = res.success || false;
        let showRecords = res1.success || false;
        if (!showPayment && showRecords) {
          this.setState({
            unPayRecords: true,
            unPayPayment: false,
          });
        } else if (!showRecords && showPayment) {
          this.setState({
            unPayRecords: false,
            unPayPayment: true,
          });
        } else {
          this.setState({
            unPayRecords: true,
            isGrayMask: true,
            unPayPayment: true,
          });
        }
      } else {
        this.setState({
          forcePay: false,
          forcePayCompleted: true,
          unPayRecords: false,
          unPayPayment: false,
        });
      }
    } else if (autoExitCard) {
      const { cardInfo = {} } = this.props.device;
      const { cardType = '' } = cardInfo;
      console.log('返回首页退卡卡类型：', cardType);
      if (
        (cardType == 2 && cardType2WithExit) ||
        (cardType == 10 && cardType10WithExit) ||
        (cardType == 11 && cardType11WithExit)
      ) {
        actions.user
          .getCheckoutCard({ cardType })
          .then((res) => res)
          .catch((res) => res);
      }
    }
    // 进入页面时 清除扫码暂存的读卡数据
    actions.scan.clearCardInfo();
    // 维护模式 添加
    let { maintenanceMode = false, maintenanceModeFrom = '' } =
      this.props.store;
    if (maintenanceMode) {
      actions.routing.push(`/maintenanceMode?from=${maintenanceModeFrom}`);
    }
    setTimeout(() => {
      changeMonitorView();
    });
    let { forceIndexPage = false, forceIndexPagePath = '/indexPage' } =
      this.props.config;
    if (forceIndexPage) {
      // 强制跳转配置开启 - 用于 主页部位 indexPage 的情况
      // 可参考配置文件 config-zzj-henan3413-xinxiang1402-print.xml
      // 情况说明：  单独的 报告打印程序， 直接选择卡验证方式
      actions.routing.push(forceIndexPagePath);
      return;
    }

    //#region  2020.08.03 ～ 首页轮询  轮询读卡
    const { indexLoopVersion2 = false } = this.props.config;
    if (indexLoopVersion2 && !maintenanceMode) {
      this.indexLoopVersion2();
      return;
    }
    //#endregion
    if (indexUseType2And10 && !indexReadingCard) {
      return;
    }

    // indexReadingCard 为 false 则首页不轮询读卡
    if (!indexReadingCard) {
      return;
    }
    let cardReader = this.props.config.cardReader['门诊'] || {};
    let method = Object.keys(cardReader).find((key) => {
      return cardReader[key].indexLogin;
    });
    //多个卡类型
    let cards = cardReader[method]['cardType'].toString().split(',');
    // 测试不用
    let doWhileTime = 1500;
    if (['1040', '1045', '1046'].includes(String(window.hospitalId))) {
      doWhileTime = 3000;
    }
    this.timer = setInterval(async () => {
      const {
        polling: { doWhile, gettingUserInfo },
        user: { isLogin = false },
      } = this.props;
      if (doWhile && !gettingUserInfo && !isLogin) {
        actions.polling.setDoWhile(false);
        this.getCardReadResult(cards);
      }
    }, doWhileTime);
    // window.getPatientInfoByCard = this.getPatientInfoByCard;
    // 当页面页面路径传入 CardNo CardType的时候  可以是用 这两个参数 作为mock 的卡号
  }

  printExeOptimization = async () => {
    const { printExeTestingOptimization = false } = this.props.config;
    if (printExeTestingOptimization) {
      const response = await doReceiptCheckType5('printExeTestingOptimization');
      const { flag = false } = response;
      if (flag === false) {
        return;
      }
      this.setState({
        printExeStatus: true,
      });
    }
  };

  indexLoopVersion2 = async () => {
    window.timer && (await clearInterval(window.timer));
    window.timer = setInterval(async () => {
      const {
        polling: { doWhile, gettingUserInfo },
        user: { isLogin = false },
        inHos: { isLogin: isInHosLogin = false },
      } = this.props;
      if (doWhile && !gettingUserInfo && !isLogin && !isInHosLogin) {
        await actions.polling.setDoWhile(false);
        this.handleIndexLoopVersion2();
      }
    }, 3000);
  };

  // 2020.04.11 ～ 首页轮询  只轮询读卡
  handleIndexLoopVersion2 = () => {
    // 读卡 并且保留当前读卡其中的信息
    const { indexUseType2And10 = false, indexLoopVersion2Config = {} } =
      this.props.config;
    let { physicalCardList = '' } = indexLoopVersion2Config;
    if (!!physicalCardList) {
      physicalCardList = String(physicalCardList);
    }
    if (!physicalCardList || typeof physicalCardList !== 'string') {
      // 未配置时 不轮询读卡
      return;
    }
    const {
      useLocalServiceVersion2 = false,
      localServiceVersion2ReadingCardTimeout = 60,
    } = this.props.config;
    if (useLocalServiceVersion2) {
      // 2020.08.10 版本 本地服务
      let reqsArr = [''].map((item, index) => {
        // 首页轮询 实体卡 ： 身份证 + 社保卡 + 就诊卡 等
        let params = {};
        // let queryList = String(physicalCardList).split(',') || []
        // if(window.hospitalId == '1109' && queryList.includes(String(10))){
        //   params.transType = 'ReadCard'
        // }
        return actions.device.getCardReadResult({
          ...params,
          cardType: String(physicalCardList),
          timeout: localServiceVersion2ReadingCardTimeout,
        });
      });
      this.getUserInfoByPromiseAllVersion2(reqsArr);
      return;
    }
    let queryList = String(physicalCardList).split(',') || [];
    if (
      useLocalServiceVersion2 &&
      ['1045'].includes(String(window.hospitalId))
    ) {
      //调小远助手时 合并查询
      queryList = String(physicalCardList) || '';
    }

    let reqsArr = queryList.map((item, index) => {
      // 首页轮询 实体卡 ： 身份证 + 社保卡 + 就诊卡 等
      return actions.device.getCardReadResult({ cardType: item });
    });
    // this.getUserInfoByPromiseAll(reqsArr)
    this.getUserInfoByPromiseAllVersion2(reqsArr);
  };

  getUserInfoByPromiseAllVersion2 = (reqsArr) => {
    const {
      indexUseType2And10 = false,
      autoDocCardInCardTypeReader = false,
      corpInfo = {},
    } = this.props.config;
    const { hospitalId = '' } = corpInfo;
    // 读卡接口返回后 判断有无读取到信息
    Promise.all(reqsArr)
      .then(async (res) => {
        // console.log('then reqsArr', res);
        let successRes = res.filter((item) => {
          return item.success;
        });
        if (successRes.length > 0) {
          // 返回有success true的情况
          let cardReadResponse = successRes[successRes.length - 1] || {};
          let { data = {} } = cardReadResponse;
          const { cardNo = '', cardType = '' } = data;
          if (
            !cardNo &&
            (cardType == 2 || (indexUseType2And10 && cardType == 10))
          ) {
            // 1.读卡成功，但是 卡为空卡， 需要提示退卡
            if (
              ['1040', '1045'].includes(String(window.hospitalId)) &&
              cardType == 10
            ) {
              //湖州中心医院 第三代社保卡his读卡 只有cardType 没有cardNo
            } else {
              Notice.alert({
                content: '未能读取到卡号，请按画面提示重新插卡，检查卡是否插反',
                duration: 5000,
                onClose: () => {
                  this.handleCardCheckout();
                },
              });
              return;
            }
          }
          this.setState({
            queryUserInfoLoading: true,
          });

          actions.polling.setGettingUserInfo(true);
          // const { isLogin = false } = await getUserInfoCommon({queryParams: data})
          const {
            isLogin = false,
            outpatientInfoMsg = '',
            outpatientInfoCode = '',
            inhosInfoMsg = '',
          } = await window.userInfoUtil
            .subscribe({
              outpatientUserInfoStart: ({ queryParams = {} }) => {
                // 门诊病人信息开始
                // console.log('outpatientUserInfoStart')
                this.setAnimation(
                  queryParams,
                  'outpatientUserInfoAnimationList'
                );
              },
              outpatientUserInfoEnd: ({ queryParams = {} }) => {
                // 门诊病人信息结束
                // console.log('outpatientUserInfoEnd')
                this.resetAnimation();
              },
              inhosUserInfoStart: ({ queryParams = {} }) => {
                // 住院病人开始
                // console.log('inhosUserInfoStart')
                this.setAnimation(queryParams, 'inhosUserInfoAnimationList');
              },
              inhosUserInfoEnd: ({ queryParams = {} }) => {
                // 住院病人结束
                // console.log('inhosUserInfoEnd')
                this.resetAnimation();
              },
            })
            .getUserInfoCommon({ queryParams: data, useSetOverTimer: true })
            .then((res) => {
              // console.log('indexPage getUserInfoCommon then', res)
              return res;
            })
            .catch((err) => {
              console.error('indexPage getUserInfoCommon catch', err);
              return err;
            });
          // 查询病人信息结束
          this.setState({
            animation: '',
            animationTitle: '',
            queryUserInfoLoading: false,
          });
          const { completeAddressAndPhone = false } = this.props.config;
          const { info = {} } = this.props.user;

          //重庆四院支持 单张和多张缴费两种模式 根据病人卡类型来判断是否单张或者多张
          if (['1109'].includes(String(window.hospitalId))) {
            //身份证 就诊卡 电子健康卡实行多张缴费 默认单张缴费
            if (['54', '10'].includes(String(info.cardType))) {
              window.config.payment.cancelCheck = false;
              window.config.payment.singlePayment = true;
              window.config.payment.paymentEdition = true;
            } else {
              window.config.payment.cancelCheck = true;
              window.config.payment.singlePayment = false;
              window.config.payment.paymentEdition = false;
            }
          }

          if (
            completeAddressAndPhone &&
            !['1030'].includes(String(window.hospitalId))
          ) {
            const { info = {} } = this.props.user;
            const { info: inHosInfo = {} } = this.props.inHos;
            let infoKey = info;
            if (!info.patientId) {
              //获取门诊病人信息失败后去取住院病人信息返回的数据
              infoKey = inHosInfo;
            }
            if (!!infoKey && Object.keys(infoKey).length > 0) {
              const { completeByDocCardOrHandInPut = false } =
                this.props.config;
              const {
                phone = '',
                idNo = '',
                maritalStatus = '',
                nation = '',
                address = '',
              } = infoKey || {};
              let condition = !phone || !idNo || !nation || !maritalStatus; //默认湖州中心医院
              if (completeByDocCardOrHandInPut && !address) {
                this.setState({
                  isCompleteUserInfo: false,
                });
                Notice.alert({
                  content: '您的信息填写不完整，请前往补全！',
                  duration: 5000,
                  onClose: () => {
                    actions.routing.replace('/account/completeByCardOrHand');
                  },
                });
                return;
              }
              if (
                ['150'].includes(String(window.hospitalId)) &&
                (!phone || !idNo)
              ) {
                if (!idNo || !phone) {
                  const { selectedFunc = {} } = this.props.store;
                  const { func = {} } = selectedFunc;
                  if (func.label && func.label == '自助充值') {
                    Notice.alert({
                      title: '提示',
                      content: (
                        <Fragment>
                          <div
                            style={{ textAlign: 'left', padding: '10px 25px' }}
                          >
                            1.您的档案缺少信息，为方便您在本院就医，我们推荐您补充完整信息；
                          </div>
                          <div
                            style={{ textAlign: 'left', padding: '10px 25px' }}
                          >
                            2.若您没带身份证可手动或者前往窗口补充，然后继续操作。
                          </div>
                        </Fragment>
                      ),
                      duration: 60000,
                      showMask: true,
                      cancelBtnText: '补充信息',
                      onClose: () => {
                        actions.routing.push('/loginSelector/completeUserInfo');
                      },
                    });
                  } else {
                    Notice.confirm({
                      title: '提示',
                      content: (
                        <Fragment>
                          <div
                            style={{ textAlign: 'left', padding: '10px 25px' }}
                          >
                            您的档案缺少信息，为方便您在本院就医，我们推荐您补充完整信息；
                          </div>
                          <div
                            style={{ textAlign: 'left', padding: '10px 25px' }}
                          >
                            2.若您没带身份证可手动或者前往窗口补充，然后继续操作。
                          </div>
                        </Fragment>
                      ),
                      duration: 60000,
                      showMask: true,
                      cancelBtnText: '取消',
                      successBtnText: '补充信息',
                      onClose: () => {
                        Notice.hide();
                        // actions.routing.replace("/indexPage")
                      },
                      onSuccess: () => {
                        actions.routing.push('/loginSelector/completeUserInfo');
                      },
                    });
                  }
                }
                return;
              }
              if (['1046'].includes(String(window.hospitalId))) {
                condition = !phone || !address || !nation || !maritalStatus;
              }
              if (['277', '512'].includes(String(window.hospitalId))) {
                condition = !address;
              }
              if (condition && !['150'].includes(String(window.hospitalId))) {
                this.setState({
                  isCompleteUserInfo: false,
                });
                Notice.alert({
                  content: '您的信息填写不完整，请前往补全！',
                  duration: 5000,
                  onClose: () => {
                    actions.routing.push(
                      '/loginSelector/completeInfoPhoneAndAddress'
                    );
                  },
                });
              }
            }
          }
          if (
            window.hospitalId == '1002' &&
            Object.keys(info).length > 0 &&
            !info.phone
          ) {
            Notice.alert({
              content: '您的信息填写不完整，请前往补全！',
              duration: 5000,
              onClose: () => {
                actions.routing.push('/docCard/fillPhoneNo?type=fixPhone');
              },
            });
          }
          if (isLogin === false) {
            // 自动卡轮询 未获取到病人信息
            const { useLocalServiceVersion2 = false, type = 'ZZJ' } =
              this.props.config;
            if (useLocalServiceVersion2) {
              // 2020.08.10 版本 本地服务
              let cardType2Bool =
                ['-2'].includes(String(outpatientInfoCode)) && cardType == '2';
              let cardType10Bool =
                outpatientInfoCode == '-2' && cardType == '10';
              if ((cardType2Bool || cardType10Bool) && type != 'ZJP') {
                // 兼容插卡获取不到信息直接退卡
                if (
                  ['345', '261', '344', '341', '346'].includes(
                    String(window.hospitalId)
                  )
                ) {
                  return this.handleCardCheckout(
                    outpatientInfoMsg ||
                      inhosInfoMsg ||
                      '未查询到患者信息，已退卡，检查卡是否正确'
                  );
                }
                return this.handleCardCheckout(
                  '未查询到患者信息，已退卡，检查卡是否正确'
                );
              }
            }
            if (
              (outpatientInfoCode == '-3' || outpatientInfoCode == '3105') &&
              autoDocCardInCardTypeReader
            ) {
              // 如有无感建档 并且能自动建档时， 不做处理
              actions.polling.setGettingUserInfo(false);
              return;
            }
            // 其他情况均提示 错误信息，并在一定时间后 重新轮询
            Notice.alert({
              content: outpatientInfoMsg || inhosInfoMsg || '未查询到患者信息',
              onClose: () => {
                setTimeout(() => {
                  actions.polling.setGettingUserInfo(false);
                }, 2000);
              },
            });
            return;
          }
          // 读卡成功 获取病人信息成功   无需操作
          if (isLogin) {
            // 获取病人信息成功，停止轮询
            const { useForcePayFor580 = false } = this.props.config;
            const { cardInfo = {} } = this.props.device;
            const { info = {} } = this.props.user;
            const { isCompleteUserInfo = true } = this.state;
            if (
              ['1040', '1045'].includes(String(window.hospitalId)) &&
              useForcePayFor580 &&
              isCompleteUserInfo
            ) {
              actions.store.setGlobalLoading(true);
              const res1 = await actions.jhRegRecord.getJhRecordList({
                medDate: moment().format('YYYY-MM-DD'),
              });
              const res = await actions.payment.getWaitBalanceBillList({
                cardNo: info.cardNo || cardInfo.cardNo || '',
              });
              actions.store.setGlobalLoading(false);
              if ((!!res && res.success) || (!!res1 && res1.success)) {
                //获取病人信息时弹框
                this.setState({
                  forcePay: true,
                  forcePayCompleted: true,
                });
                let showPayment = res.success;
                let showRecords = res1.success;
                if (!showPayment && showRecords) {
                  this.setState({
                    unPayRecords: true,
                    unPayPayment: false,
                  });
                } else if (!showRecords && showPayment) {
                  this.setState({
                    unPayRecords: false,
                    unPayPayment: true,
                  });
                } else {
                  this.setState({
                    unPayRecords: true,
                    isGrayMask: true,
                    unPayPayment: true,
                  });
                }
              } else {
                this.setState({
                  forcePay: false,
                  forcePayCompleted: true,
                  unPayRecords: false,
                  unPayPayment: false,
                });
              }
            }
            actions.polling.setDoWhile(false);
            const { mobileSupplement = false } = this.props.config;
            const { phone = '' } = info;
            if (mobileSupplement && !phone) {
              Notice.confirm({
                title: '提示',
                content: '未检测到手机号 需要前往补全',
                duration: 15000,
                showMask: true,
                cancelBtnText: '跳过',
                successBtnText: '前往补全',
                onClose: async () => {
                  await actions.step.setNext('/indexPage');
                  return actions.routing.push('/account/confirmUserInfo');
                },
                onSuccess: async () => {
                  await actions.step.setNext('/indexPage');
                  return actions.routing.push('/account/confirmUserInfo');
                },
              });
            }
            if (window.location.href.indexOf('/indexPage') > -1 === false) {
              // 查询到病人信息  并且 当前页面不为主页时
              // actions.routing.replace('/indexPage')
            }
            // if(window.hospitalId == "1040" && successRes[0].data.cardType == "1"){
            //   // 1.将 卡信息 设置到 建档中
            //   // 2.跳转到输入手机号/建档信息确认页
            //   //湖州中心 读卡读到身份证时 无脑建档
            //   Notice.alert({
            //     content:"即将为您跳转至建档...",
            //     duration: 5000,
            //     onClose:()=>{
            //       actions.store.getDocUser({
            //         ...successRes[0].data,
            //         cardType: '2',
            //         nextPath: '/docCard/fillPhoneNo',
            //     })
            //     }
            //   })
            // }
          }
        } else {
          console.log('轮询未读取到任何卡');
          // 继续轮询
          // setTimeout(() => {
          actions.polling.setDoWhile(true);
          // }, 1000)
        }
      })
      .catch((err) => {
        // 继续轮询
        // setTimeout(() => {
        actions.polling.setDoWhile(true);
        // }, 1000)
      });
  };

  getCardReadResult = async (arr) => {
    let { indexUseType2And10 = false } = this.props.config;
    let reqsArr = arr.map((item, index) => {
      if (item == 1) {
        return { success: false };
      }
      if (item == 10) {
        if (indexUseType2And10) {
          return actions.device.getCardReadResult({ cardType: item });
        }
        return { success: false };
      }
      // 就诊卡 或者其他卡类型
      return actions.device.getCardReadResult({ cardType: item });
    });
    Promise.all(reqsArr)
      .then(async (res) => {
        // console.log('then reqsArr', res);
        let successRes = res.filter((item) => {
          return item.success;
        });
        if (successRes.length > 0) {
          // 返回有success true的情况
          let cardReadResponse = successRes[successRes.length - 1] || {};
          let { data = {} } = cardReadResponse;
          let { cardNo = '', cardType = '' } = data;
          if (!!cardNo) {
            // 2.读卡成功，继续获取病人信息
            this.setState({
              queryUserInfoLoading: true,
            });
            const resInfo = await this.getPatientInfoByCard(data);
            this.setState({
              queryUserInfoLoading: false,
            });
            // console.log('resInfo', resInfo);
            if (!!resInfo.patientId) {
              // 获取病人信息成功，停止轮询
              actions.polling.setDoWhile(false);
            } else {
              // 获取病人信息失败，开始轮询
              // 1.读卡成功，但是 卡为空卡， 需要提示退卡
              Notice.alert({
                content: resInfo.msg || '未找到您的就诊信息',
                duration: 5000,
                onClose: () => {
                  this.handleCardCheckout();
                  // setTimeout(() => {
                  //   actions.polling.setDoWhile(true);
                  // }, 3000);
                },
              });
            }
            // 3.读卡成功，获取病人信息失败，提示退卡
          } else if (
            !cardNo &&
            (cardType == 2 || (indexUseType2And10 && cardType == 10))
          ) {
            // 1.读卡成功，但是 卡为空卡， 需要提示退卡
            Notice.alert({
              content: '未能读取到卡号，请按画面提示重新插卡，检查卡是否插反',
              duration: 5000,
              onClose: () => {
                this.handleCardCheckout();
              },
            });
          }
        } else {
          // 继续轮询
          // setTimeout(() => {
          actions.polling.setDoWhile(true);
          // }, 1000)
        }
      })
      .catch((err) => {
        // 继续轮询
        // setTimeout(() => {
        actions.polling.setDoWhile(true);
        // }, 1000)
      });
  };

  getPatientInfoByCard = async (cardInfo) => {
    let {
      todoDrawer: { todoTypeDic },
    } = this.props.config;
    actions.polling.setGettingUserInfo(true);
    const res = await actions.user
      .queryPatientInfo({ ...cardInfo, patientName: cardInfo.name || '' })
      .then((res) => {
        // let patientInfo = {
        //   cardNo: res.seqno,
        //   cardType: this.props.device.cardInfo && this.props.device.cardInfo.cardType,
        //   patientId: res.patientId
        // }
        // if(!!todoTypeDic){
        //   if(todoTypeDic.regRecords){
        //     actions.user.getRegToTake(patientInfo)
        //   }
        //   if(todoTypeDic.billRecords){
        //     actions.user.getBillToPay(patientInfo)
        //   }
        // }
        return res;
      })
      .catch((err) => {
        // console.error('获取病人信息失败', err);
        return err;
      });
    actions.polling.setGettingUserInfo(false);
    return res;
  };

  closeDrawer = () => {
    this.setState({
      drawerVisible: false,
    });
  };

  openDrawer = () => {
    this.setState({
      drawerVisible: true,
    });
  };

  toggleDrawer = () => {
    let { drawerVisible } = this.state;
    this.setState({
      drawerVisible: !drawerVisible,
    });
  };

  publicfunction(func) {
    if ('available' in func && !func.available) {
      Notice.alert({
        content: '该功能暂不可用',
      });
      return;
    }
    if ('timeLimit' in func && func.timeLimit == true) {
      const { morningTime = '', afternoonTime } = this.props.config;
      // * 判断时间限制
      const { success = false, msg = '' } = testDateRange(
        morningTime,
        afternoonTime
      );
      if (!success) {
        if (!!msg) {
          Notice.alert({
            content: msg,
          });
          return;
        }
        Notice.alert({
          content: (
            <p>
              <span>当前不在挂号时间</span>
              <br />
              <span>
                可挂号时间段为：{morningTime}，{afternoonTime}
              </span>
            </p>
          ),
        });
        return;
      }
    }
    let { receiptCheck = false } = this.props.config;
    if (func.forceLogin) {
      actions.user.clearUser();
      !!func.path && actions.step.setNext(func.path);
      if (!!func.path && !!receiptCheck) {
        doReceiptCheck();
      }
      actions.routing.push(
        (func.loginPath || '/login') + this.props.location.search
      );
      return;
    }
    if (func.needLogin) {
      // 登录前设置 setNext
      !!func.path && actions.step.setNext(func.path);
      if (!!func.path && !!receiptCheck) {
        doReceiptCheck();
      }
    }
    // 住院相关 配置 根据住院号和卡号查询住院信息
    if (
      func.needLogin &&
      !this.props.user.isLogin &&
      func.cardType &&
      func.inputHosId
    ) {
      // console.log('住院号 卡号同时支持！')
      // return
    }
    // 只支持输入住院号 needLogin false
    // 只支持卡号 进入登录页
    if (func.needLogin && !this.props.user.isLogin) {
      // actions.routing.replace("/login" + this.props.location.search);
      actions.routing.push(
        (func.loginPath || '/login') + this.props.location.search
      );
      return;
    }
    if (
      (func.path == '/docCard/idCard' ||
        func.path == '/loginSelector/CardTypeSelectorForDocCard') &&
      this.props.user.isLogin
    ) {
      Notice.alert({
        content: '您已有账户登录，请退卡后重新建档',
      });
      return;
    }
    // test 路径加参数
    // actions.routing.replace(func.path + this.props.location.search);
    actions.routing.push(func.path);
  }
  async onFunctionClick(func) {
    actions.store.funcSelected({ func });

    // 2022.03.22 新增更更多
    if (func.label == '更多功能' || func.label == '更多') {
      this.setState({
        moreFunctionsCard: true,
      });
      return;
    }

    // 登陆后跳转路径设置
    if (func.needLogin || func.forceLogin) {
      !!func.path && actions.step.setNext(func.path);
    }
    // 2020.11.13新增，  添加轮询问时 ，判断是否正在读卡， 如果正在读卡中，提示 “读卡中”
    const {
      useLocalServiceVersion2 = false, // 使用新本地服务
      useHardwareCardCheckreading = true, // 使用跳转前读卡检测  2021.01.05 默认值改为 true，防止漏掉
      indexLoopVersion2 = false, // 首页轮询
    } = this.props.config;
    const { doWhile } = this.props.polling;
    const { cardInfo = {} } = this.props.device;
    const { info = {} } = this.props.user;
    const { cardNo = '' } = cardInfo;
    const { phone, idNo, address, sex } = info;

    if (['1030'].includes(String(window.hospitalId))) {
      if (
        !!cardNo &&
        func.label != '当天挂号' &&
        (func.label == '预约挂号' || func.label == '预约取号/取消')
      ) {
        if (!!info && !!info.patientId) {
          if (!idNo || !address || !sex) {
            actions.routing.push('/loginSelector/completeInfoPhoneAndAddress');
            return;
          }

          if (!phone) {
            actions.routing.push('/docCard/fillPhoneNo?type=fixPhone');
            return;
          }
        }
      }
    }

    //23:45 - 00:15 重庆四院扎帐中
    if (['1109'].includes(String(window.hospitalId))) {
      let result = testDateRange2('00:16-23:30');
      if (
        !result.success &&
        ['自助缴费', '当天挂号', '预约挂号', '住院预缴'].includes(
          String(func.label)
        )
      ) {
        Notice.alert({
          content:
            '内部系统维护中（23:30-00:15），请前往窗口办理支付业务。带来不便，敬请谅解！',
        });
        return;
      }
    }
    if (this.handler._renderAlertOnFunctionClick(this, func)) {
      return;
    }
    // if(['150'].includes(String(window.hospitalId)) && (!phone || !address ||!idNo)){
    //   if(!address ||!idNo || !phone){
    //     Notice.confirm({
    //       title: '提示',
    //       content: (<Fragment>
    //         <div style={{textAlign:'left',padding:'10px 25px'}}>
    //         您的档案缺少信息，为方便您在本院就医，我们推荐您补充完整信息；
    //         </div>
    //         <div style={{textAlign:'left',padding:'10px 25px'}}>2.若您没带身份证可手动或者前往窗口补充，然后继续操作。</div>
    //       </Fragment>),
    //       duration: 60000,
    //       showMask: true,
    //       cancelBtnText: '取消',
    //       successBtnText: '补充信息',
    //       onClose: () => {
    //         Notice.hide()
    //         actions.routing.replace("/indexPage")
    //       },
    //       onSuccess: () => {
    //         actions.routing.push("/loginSelector/completeUserInfo")
    //       }
    //     })
    //   }
    //   return
    // }

    // if(func.key == '检验取单2' && window.hospitalId == '1002'){//义乌中心医院调HISexe
    //   const { info = {} } = this.props.user
    //   if(Object.keys(info).length > 0){
    //     if(window.require && window.require('child_process')) {
    //         Notice.alert({
    //           content:"正在唤起lis打印程序，请稍候.."
    //         })
    //         const exec = window.require('child_process').exec;
    //         const code = info.patientId || ''
    //         // 程序调用路径
    //         const cmd = `cmd.exe /C start D:\\zjhis\\lis3.5\\lis2.exe`
    //         console.log(`[CallExe]调用检验取单打印程序: ${cmd}`)
    //         exec(`${cmd} ${code}`);
    //     } else {
    //       console.log('[CallExe.js] 请在自助机上测试')
    //     }
    //     return
    //   }
    // }

    //湖州中心医院 现金充值 cardStatus  => 银医通账户未开通
    if (
      ['1040', '1045', '1046'].includes(String(window.hospitalId)) &&
      func.path.indexOf('cash') > -1
    ) {
      const { info = {} } = this.props.user; //仅开通院内账户时支持充值
      if ('cardStatus' in info && info.cardStatus == '0') {
        Notice.alert({
          content: '您尚未开通院内账户，无法充值！',
          duration: 5000,
          onClose: () => {
            actions.routing.replace('/indexPage');
          },
        });
        return;
      }
    }
    if (['345', '261', '344', '346'].includes(String(window.hospitalId))) {
      const { info = {} } = this.props.user;
      if (info.accountType == '2') {
        //临时卡
        if (func.key == '自助充值') {
          Notice.alert({
            content: '临时卡不支持充值业务，请先完实名认证!',
            duration: 5000,
            onClose: () => {
              Notice.hide();
            },
          });
          return;
        }
      }
    }
    // if(window.hospitalId == '1109' && func.loginPath == '/loginSelector'){
    //   //需求描述：重庆四院老档案不存在身份证号 用身份证号查不到档案 要求提示用手输就诊号查档案
    //   const { info = {} } = this.props.user
    //   const { cardInfo = {} } = this.props.device
    //   if(cardInfo.cardType == 1 && Object.keys(info).length == 0){
    //     Notice.alert({
    //       content: '未发现患者信息，请返回选择手输就诊卡号重试',
    //       duration: 5000,
    //       onClose:()=>{
    //         actions.routing.replace('/loginSelector')
    //       }
    //     })
    //     return
    //   }
    // }
    if (
      window.hospitalId == '1109' &&
      func.label == '自助缴费' &&
      Object.keys(cardInfo).length > 0
    ) {
      try {
        const { extend = '' } = cardInfo;
        let pInfo = !!extend && JSON.parse(extend);
        let illInfo =
          ('特慢病信息' in pInfo &&
            !!pInfo.特慢病信息 &&
            pInfo.特慢病信息.data) ||
          {};
        if (illInfo.length > 0) {
          Notice.alert({
            content: '特慢病患者请前往人工窗口缴费',
            duration: 5000,
            onClose: () => {
              actions.routing.replace('/indexPage');
            },
          });
          return false;
        }
      } catch (err) {
        console.log('err in indexPageZJP4.0:', err);
      }
    }

    if (
      useLocalServiceVersion2 &&
      useHardwareCardCheckreading &&
      indexLoopVersion2 &&
      !!cardNo === false &&
      doWhile === false
    ) {
      // 当前无卡，并且未在轮询时
      // 此处进行判断
      // 如正在轮询中，需要进行卡状态查询
      const response = await hardwareCardCheckreading();
      const { flag = false, msg = '' } = response;
      if (flag === true) {
        Notice.alert({
          content: msg,
          duration: 1000 * 15,
        });
        return;
      }
    }
    if (!!func.patientType) {
      actions.medicalTechnology.setPatientType(func.patientType);
    }
    const { showRegistrationRegType4 = false } = this.props.config;
    if (
      func.label == '满意度调查' &&
      ['345', '261', '346', '344', '341'].includes(String(window.hospitalId))
    ) {
      if (window.require && window.require('child_process')) {
        Notice.alert({
          content: '调查问卷正在打开，请稍候..',
        });
        const exec = window.require('child_process').exec;
        // 程序调用路径
        const cmd = /*i18n-disable*/ `cmd.exe /C start D:\\A王毅\\forewell_nhcrm_pn\\nhcrm_browser.exe`;
        console.log(`[CallExe]调用满意度调查程序: ${cmd}`);
        exec(`${cmd}`);
      } else {
        console.log('[CallExe.js] 请在自助机上测试');
      }
    }
    // if (['检验取单', '病历打印', '病理报告打印'].includes(String(func.label)) && ['277'].includes(String(window.hospitalId))) {
    //   //黄岛人民 用url访问
    //   const { info = {} } = this.props.user
    //   const { iexplorePageLisUrl = '', iexplorePagePacsUrl = '' } = this.props.config
    //   if (Object.keys(info).length > 0) {//已经核身到档案时
    //     try {
    //       // 2020.09.22 更新 调用 ie浏览器 并且在 10秒后关闭ie
    //       let url = ''
    //       if (func.label == '检验取单') {//lis
    //         url = `${iexplorePageLisUrl}?PatCardNo=${info.patientCard || ''}&ITimeAmount=7&RecRptTimeLimit=1&RecRptLengthSmpleLimit=0&hospitalId=50001&hospitalIdForConfig=50001&userSysId=279528&cardType4His=1&IsMulticard=0&strAddtionData=1,0,30,0,检验科,检验科,15,1000&ReportWays=0&BankHos=1`
    //       } else if (func.label == '病历打印') {//pacs
    //         url = `${iexplorePagePacsUrl}?outPatCode=${info.patientCard || ''}`
    //         if (window.count < 1) {//可以打印
    //           window.count += 1
    //         } else {//防止重复打印
    //           Notice.alert({
    //             content: "当前报告单已经打印，无法重复打印",
    //             duration: 5000
    //           })
    //           return
    //         }
    //       }else if(func.label == '病理报告打印'){
    //         url = `http://149.98.213.3/pacsPrintSelft/pacsPrints.aspx?out_pat_code=${info.patientCard || ''}`
    //       }
    //       console.log('调用url:' + url);
    //       const exec = window.require('child_process').exec;
    //       console.log('<==== 创建子进程，参数：' + JSON.stringify(info.patientCard || ''));
    //       let cmd = "cmd.exe /C start /MAX iexplore.exe";
    //       exec(`${cmd} "${url}"`);
    //       // 过10秒后 关闭 ie 浏览器
    //       setTimeout(() => {
    //         exec(`taskkill /f /im iexplore.exe`);
    //       }, 1000 * 120)
    //     } catch (e) {
    //       console.error('Error in 调用ie浏览器,' + JSON.stringify(e))
    //     }
    //     return
    //   }
    // }
    if (
      func.key === '实名认证' &&
      ['261', '346', '344'].includes(String(window.hospitalId))
    ) {
      if (this.props.user.isLogin && info.renamType != -1) {
        return Notice.alert({
          content: '当前账户已实名',
        });
      }
      actions.step.setModule('实名认证'); // 定义当前模块类型
    }
    if (func.label === '电子健康卡' && 'tips' in func && func.tips) {
      this.setState({
        showTips: true,
        setFunc: func,
        click: true,
      });
      return;
    }
    if ('tips' in func && func.tips) {
      this.setState({
        showTips: true,
        setFunc: func,
        click: false,
      });
      return; //表示退出点击事件
    }
    // 不在有效时间，阻止操作
    if (
      'timeLimit2' in func &&
      func.timeLimit2 == true &&
      !showRegistrationRegType4
    ) {
      const { allDayTime = '' } = this.props.config;
      // * 判断时间限制
      const { success = false, msg = '' } = testDateRange2(allDayTime);
      if (!success) {
        if (!!msg) {
          Notice.alert({
            content: msg,
          });
          return;
        }
        Notice.alert({
          content: ['162'].includes(String(window.hospitalId)) ? (
            <p>
              <span>挂号时间为当日{allDayTime}</span>
              <br />
              <span>请前往二号楼一楼急诊自助机挂急诊号</span>
            </p>
          ) : (
            <p>
              <span>当前不在挂号时间</span>
              <br />
              <span>可挂号时间段为：{allDayTime}</span>
            </p>
          ),
          duration: 1000 * 15,
        });
        return;
      }
    }
    if ('available' in func && !func.available) {
      Notice.alert({
        content: '该功能暂不可用',
      });
      return;
    }
    // 不在自助入院有效时间，阻止操作
    if (
      'timeLimitForInhosSelf' in func &&
      func.timeLimitForInhosSelf == true &&
      'allDayTime' in func &&
      !!func.allDayTime
    ) {
      const { allDayTime = '' } = func || {};
      // * 判断时间限制
      const { success = false } = testDateRange2(allDayTime);
      if (!success) {
        Notice.alert({
          content: (
            <p>
              <span>自助入院服务时间为：{allDayTime}</span>
              <br />
              <span>
                其他时间请您到住出院窗口或急诊财务窗口(夜间)咨询办理手续！
              </span>
            </p>
          ),
          duration: 1000 * 15,
        });
        return;
      }
    }
    // 功能按钮时间限制-通用限制
    if (
      'timeLimitForThisItem' in func &&
      func.timeLimitForThisItem == true &&
      'allDayTime' in func &&
      !!func.allDayTime
    ) {
      const { allDayTime = '', timeLimitNoticeForThisItem = '' } = func || {};
      // * 判断时间限制
      const { success = false } = testDateRange2(allDayTime);
      if (!success) {
        Notice.alert({
          content: (
            <div
              dangerouslySetInnerHTML={{ __html: timeLimitNoticeForThisItem }}
            />
          ),
          duration: 1000 * 15,
        });
        return;
      }
    }
    const { receiptCheck = false } = this.props.config;
    // 2021.03.25 新增 如无需凭条检测则
    if (!('noDoReceiptCheck' in func && func.noDoReceiptCheck === false)) {
      if (!!func.doReceiptCheckForSingleFunc) {
        //内江凭条检测 做特殊处理
        doReceiptCheck();
      } else if (func.needLogin || func.forceLogin) {
        // 凭条检测
        if (!!func.path && !!receiptCheck) {
          doReceiptCheck();
        }
      }
    }
    // 激光打印机检测
    if (!!func.path && !!func.receiptCheckType5) {
      if (!this.state.printExeStatus) {
        // printExeStatus 用于判断优化exe激光打印检测
        // doReceiptCheckType5();
        const response = await doReceiptCheckType5();
        const { flag = false, msg = '' } = response;
        if (flag === false) {
          Notice.alert({
            content: msg,
          });
          return;
        }
      }
    }
    if ('timeLimit' in func && func.timeLimit == true) {
      const { morningTime = '', afternoonTime } = this.props.config;
      // * 判断时间限制
      const { success = false, msg = '' } = testDateRange(
        morningTime,
        afternoonTime
      );
      if (!success) {
        if (!!msg) {
          Notice.alert({
            content: msg,
          });
          return;
        }
        Notice.alert({
          content: (
            <p>
              <span>当前不在挂号时间</span>
              <br />
              <span>
                可挂号时间段为：{morningTime}，{afternoonTime}
              </span>
            </p>
          ),
        });
        return;
      }
    }
    // 如已有档案， 阻止进一步建档
    if (
      ([
        '/docCard/idCard',
        '/loginSelector/CardTypeSelectorForDocCard',
      ].includes(func.path) ||
        !!func.noOutpatientUserInfo) &&
      this.props.user.isLogin
    ) {
      Notice.alert({
        content: '当前已有账户登录，可直接进行操作',
      });
      return;
    }
    // 发卡机状态检测
    if (
      'doHardwareDispenserCheckstate' in func &&
      !!func.doHardwareDispenserCheckstate
    ) {
      const response = await doHardwareDispenserCheckstate();
      const { flag = false, msg = '' } = response;
      if (flag === false) {
        Notice.alert({
          content: msg,
        });
        return;
      }
    }
    //湖州中心医院 挂号提示
    if (
      'key' in func &&
      func.key == '当天挂号' &&
      ['1040'].includes(String(window.hospitalId))
    ) {
      Notice.alert({
        content:
          '如有发热（体温大于37.3℃）请到发热门诊就诊；如有急性腹泻（>3次/天）请到肠道门诊就诊',
        duration: 5000,
      });
    }
    //衢州中医院 挂号提示
    if (
      'key' in func &&
      func.key == '当天挂号' &&
      ['170'].includes(String(window.hospitalId))
    ) {
      Notice.alert({
        content: '胸痛、急性脑卒中患者请到急诊科挂号就诊',
        duration: 5000,
      });
    }
    if (
      'key' in func &&
      func.key == '当天挂号' &&
      ['1045'].includes(String(window.hospitalId))
    ) {
      Notice.alert({
        content:
          '本机构不收治发热病人，如有发热（体温大于37.3℃），请到定点发热医院就诊',
        duration: 5000,
      });
    }
    // //青岛妇儿医院 挂号提示
    // if (["261","344"].includes(String(window.hospitalId)) && "key" in func && ["挂号","预约取号"].includes(String(func.key))){
    //   Notice.alert({
    //     content:"如您发病前14天去过武汉或当前疫情严重地区，请前往发热门诊就诊。",
    //     duration:5000
    //   })
    // }
    if (
      func.path == '/docCard/idCard' ||
      func.path == '/loginSelector/CardTypeSelectorForDocCard'
    ) {
      if (this.props.user.isLogin) {
        return Notice.alert({
          content: '您已有账户登录，请退卡后重新建档',
        });
      } else {
        if (receiptCheck) {
          doReceiptCheck();
        }
      }
    }

    if (indexLoopVersion2) {
      window.userInfoUtil.handleCardClick(func, (cardConfig) => {
        this.functionClickInner(cardConfig);
      });
      return;
    }
    this.functionClickInner(func);
  }

  functionClickInner = async (func) => {
    // 需要强制登陆时的配置项
    if (func.forceLogin) {
      actions.user.clearUser();
      actions.routing.push(
        (func.loginPath || '/login') + this.props.location.search
      );
      return;
    }

    // 只支持卡号 进入登录页
    if (func.needLogin && !this.props.user.isLogin) {
      // 需要登陆时
      // actions.routing.replace("/login" + this.props.location.search);
      actions.routing.push(
        (func.loginPath || '/login') + this.props.location.search
      );
      return;
    }
    if (func.path == '/zndzIndex') {
      actions.zndz.setZndzUserInfo({ front: true, ageUtil: '岁' });
    }
    actions.routing.push(func.path);
  };

  handleCardCheckout = async (noticeText) => {
    this.setState({
      forcePay: false,
      forcePayCompleted: false,
    });
    actions.device.cancelPending();
    actions.polling.setGettingUserInfo(false);
    if (
      this.props.device.carReadResult &&
      this.props.device.carReadResult.success
    ) {
      if (!(this.props.device.cardInfo.cardType || '')) {
        return;
      }
      await actions.user
        .getCheckoutCard({
          cardType: this.props.device.cardInfo.cardType || '',
        })
        .then((res) => {
          if (res.success) {
            //(checkoutLoading || globalLoading || queryUserInfoLoading)
            const { exitBtnText = '退卡' } = this.props.config;
            Notice.alert({
              icon: 'success',
              content: noticeText ? noticeText : `${exitBtnText}成功`,
              onClose: () => {
                // 退卡成功时 进行判断 是否需要 显示维护提醒
                setTimeout(() => {
                  changeMonitorView();
                }, 0);
              },
            });
          }
        })
        .catch((err) => {
          Notice.alert({
            content: err.msg || '退卡失败',
          });
        });
      const { drawerVisible = false } = this.props.config;
      this.setState({
        checkoutLoading: false,
        queryUserInfoLoading: false,
        drawerVisible,
      });
    }
  };

  // 浙一 强制退卡
  handleForceExitCardFor1312 = async () => {
    this.setState({
      checkoutLoading: true,
    });
    const res = await api
      .getCheckoutCard({ cardType: '2' })
      .then((res) => res)
      .catch((err) => err);
    this.setState({
      checkoutLoading: false,
    });
    if (!!res && res.success) {
      Notice.alert({
        icon: 'success',
        content: '操作成功',
      });
    } else {
      Notice.alert({
        content: res.msg || '操作失败',
      });
    }
  };

  // 泸州中医院 强制退卡
  handleForceExitCardFor1125 = async () => {
    this.setState({
      checkoutLoading: true,
    });
    const res = await api
      .getCheckoutCard({ cardType: '10' })
      .then((res) => res)
      .catch((err) => err);
    this.setState({
      checkoutLoading: false,
    });
    if (!!res && res.success) {
      Notice.alert({
        icon: 'success',
        content: '操作成功',
      });
    } else {
      Notice.alert({
        content: res.msg || '操作失败',
      });
    }
  };

  // 沙井 强制退卡
  handleForceExitCardFor713 = async () => {
    let arr = [2, 10];
    let reqsArr;
    const { useLocalServiceVersion2 = false } = this.props.config;
    if (useLocalServiceVersion2) {
      // 2020.08.10 版本 本地服务
      reqsArr = api.getCheckoutCard({ cardType: String(arr) });
    } else {
      reqsArr = arr.map((item, index) => {
        return api.getCheckoutCard({ cardType: item });
      });
    }
    this.setState({
      checkoutLoading: true,
    });
    Promise.all(reqsArr)
      .then(async (res) => {
        this.setState({
          checkoutLoading: false,
        });
        let successRes = res.filter((item) => {
          return item.success;
        });
        if (successRes.length > 0) {
          // 返回有success true的情况
          Notice.alert({
            icon: 'success',
            content: '操作成功',
          });
        } else {
          console.log('强制退卡返回：' + JSON.stringify(res));
          Notice.alert({
            content: '操作失败',
          });
        }
      })
      .catch((err) => {
        this.setState({
          checkoutLoading: false,
        });
      });
  };

  handleForceExitCard = async () => {
    this.initAllData();
    if (window.hospitalId == '1125') {
      // 泸州中医院强制退卡
      window.userInfoUtil && window.userInfoUtil.init();
      this.handleForceExitCardFor1125();
      return;
    }
    if (['1312', '1310'].includes(String(window.hospitalId))) {
      // 浙一强制退卡
      window.userInfoUtil && window.userInfoUtil.init();
      this.handleForceExitCardFor1312();
      return;
    }
    if (
      ['710', '701', '713', '162', '714', '163'].includes(
        String(window.hospitalId)
      )
    ) {
      // 沙井
      window.userInfoUtil && window.userInfoUtil.init();
      this.handleForceExitCardFor713();
      return;
    }
    const { corpInfo = {}, isSuZhouKeJiChengSheQu = false } = this.props.config;
    const { hospitalId = '' } = corpInfo;
    const { queryUserInfoLoading } = this.state;
    // 强制退卡
    this.setState({
      checkoutLoading: true,
    });
    let exitCardType = 2;
    if (hospitalId == '212' || isSuZhouKeJiChengSheQu) {
      exitCardType = 10;
    }
    if (hospitalId == '631') {
      exitCardType = 10;
    }
    if (hospitalId == '1030') {
      exitCardType = '10,11';
    }
    if (hospitalId == '1002') {
      exitCardType = '11';
    }
    if (hospitalId == '1045') {
      exitCardType = '2,10';
    }
    actions.polling.setGettingUserInfo(false);
    const res = await api
      .getCheckoutCard({ cardType: exitCardType })
      .then((res) => res)
      .catch((err) => err);
    this.setState({
      checkoutLoading: false,
    });
    if (!!res && res.success) {
      if (queryUserInfoLoading) {
        this.setState({
          queryUserInfoLoading: false,
        });
      }
      Notice.alert({
        icon: 'success',
        content: '操作成功',
      });
    } else {
      Notice.alert({
        content: res.msg || '操作失败',
      });
    }
  };

  initAllData = () => {
    actions.user.clearUser(); // 清除门诊病人信息
    actions.inHos.clearUser(); // 清除住院病人信息
    window.count = 0;
    actions.device.setCardReadResult({}); // 清除读卡器信息
    window.userInfoUtil && window.userInfoUtil.init();
  };

  //弹框点击取消
  handleCancel() {
    this.setState({
      showTips: false,
    });
  }
  //弹框点击确定
  handleComfirm() {
    let { setFunc } = this.state;
    this.publicfunction(setFunc);
  }

  getLayout({
    showHeaderTime = true,
    removeUserInfoIndex = false,
    isLogin = false,
    forceIndexPage = false,
  }) {
    const { showUserInfoOther = false } = this.props.config;
    let config = {
      // timeIndex: showHeaderTime,
      infoIndex: true,
      timeOther: showHeaderTime,
      infoOther: true,
    };
    if (removeUserInfoIndex) {
      config.infoIndex = false;
    }
    if (forceIndexPage) {
      config.infoIndex = false;
      config.infoOther = false;
    }
    if (showUserInfoOther) {
      config.infoOther = showUserInfoOther;
    }
    return config;
  }

  /**
   * 设置屏幕主按钮样式2
   * @param {*} config 整体配置文件
   */
  renderMainStyle = (config = {}) => {
    const {
      indexPage = {},
      useThemeVersion = false,
      useThemeVersion2 = false,
    } = config;
    const { function: functionList = {} } = indexPage;
    let firstFuncList = [];
    let styleList = [];
    let functionListOnly = functionList || [];
    let baseStyle = {
      //设置最小单位的大小 border = 7px
      width: '106',
      height: '94',
      top: '0',
      left: '0',
      position: 'absolute',
    };
    let list = functionList;
    if (!isArray(list)) {
      list = [list];
    }
    firstFuncList =
      list
        .map((item, key) => item.location)
        .filter((item) => item !== undefined) || {}; //过滤有location的func 返回坐标
    for (let i = 0; i < firstFuncList.length; i++) {
      if (
        firstFuncList[i].hasOwnProperty('startOffset') &&
        firstFuncList[i].hasOwnProperty('endOffset')
      ) {
      } else {
        Notice.alert({
          content: '配置location但未配置定位元素！',
          duration: 5000,
        });
        this.setState({
          useType4_1_0: false, //出错时 使用老版本
        });
        return;
      }
      //6*8
      let start = firstFuncList[i].startOffset.split(','); //未设置时返回最小单位
      let end = firstFuncList[i].endOffset.split(',');
      if (end[1] - start[1] < 0 || end[0] - start[0] < 0) {
        Notice.alert({
          content: '配置文件定位元素参数错误！',
          duration: 5000,
        });
        this.setState({
          useType4_1_0: false,
        });
        return;
      }
      let commonStyle = Object.assign({}, baseStyle);
      commonStyle.width = 106 + 130 * (end[1] - start[1]) + 'px';
      commonStyle.height = 94 + 118 * (end[0] - start[0]) + 'px';
      commonStyle.top = 118 * (start[0] - 1) + 'px';
      commonStyle.left = 130 * (start[1] - 1) + 'px';
      if (useThemeVersion) {
        commonStyle.borderRadius = '40px';
        commonStyle.width = 91 + 123 * (end[1] - start[1]) + 'px';
        commonStyle.height = 79 + 111 * (end[0] - start[0]) + 'px';
        commonStyle.left = 123 * (start[1] - 1) + 'px';
        commonStyle.top = 32 + 111 * (start[0] - 1) + 'px';
      }
      // TODO
      if (useThemeVersion2) {
        commonStyle.borderRadius = '12px';
        commonStyle.width = 124 + 124 * (end[1] - start[1]) + 'px';
        commonStyle.height = 94 + 118 * (end[0] - start[0]) + 'px';
        commonStyle.left = 130 * (start[1] - 1) + 'px';
        commonStyle.top = 0 + 118 * (start[0] - 1) + 'px';
      }
      styleList.push(commonStyle);
    }
    return styleList;
  };

  renderExitCardBtnSlot = () => {
    const { carReadResult = {}, cardInfo = {} } = this.props.device;
    const { cardType = '' } = cardInfo;
    const { useType4_1_0 = false, useThemeVersion = false } = this.props.config;
    if (useThemeVersion) {
      // 对应展示逻辑在 src/component/base/FixedUserInfo.js
      return;
    }
    const {
      indexUseType2And10 = false,
      cardType1WithExit = false,
      cardType2WithExit = false,
      cardType10WithExit = false,
      cardType11WithExit = false,
      cardType16WithExit = false,
      cardType17WithExit = false,
      cardType18WithExit = false,
      cardType24WithExit = false,
      cardType54WithExit = false,
      cardType55WithExit = false,
    } = this.props.config;
    if (carReadResult.success) {
      if (
        cardType == 2 ||
        (indexUseType2And10 &&
          (cardType == 2 || cardType == 10 || cardType == 13)) ||
        (cardType1WithExit && cardType == 1) ||
        (cardType2WithExit && cardType == 2) ||
        (cardType10WithExit && cardType == 10) ||
        (cardType11WithExit && cardType == 11) ||
        (cardType16WithExit && cardType == 16) ||
        (cardType17WithExit && cardType == 17) ||
        (cardType18WithExit && cardType == 18) ||
        (cardType24WithExit && cardType == 24) ||
        (cardType54WithExit && cardType == 54) ||
        (cardType55WithExit && cardType == 55)
      ) {
        const { exitBtnText = '退卡' } = this.props.config;
        return (
          <Fragment>
            {useType4_1_0 ? (
              <Button
                className='new-indexpage-base410-CardCheckout'
                onTouchEnd={this.handleCardCheckout.bind(this)}
              >
                {exitBtnText || '退卡'}
              </Button>
            ) : (
              <Button
                className='orange-button big-button return-the-card-button'
                activeClassName='big-button-active'
                style={{ position: 'relative', zIndex: '12' }}
                onTouchEnd={this.handleCardCheckout.bind(this)}
              >
                {exitBtnText || '退卡'}
              </Button>
            )}
          </Fragment>
        );
      }
    }
    return null;
  };

  /**
   * 设置屏幕主按钮样式
   * @param {*} config 整体配置文件
   */
  renderStyle = (config = {}) => {
    const {
      indexPage = {},
      useThemeVersion = false,
      useThemeVersion2 = false,
    } = config;
    const { function: functionList = {} } = indexPage;
    let firstFuncList = [];
    let styleList = [];
    let functionListOnly = functionList || [];
    let baseStyle = {
      //设置最小单位的大小
      width: '106',
      height: '94',
      top: '7px',
      left: '7px',
      fontSize: '45',
      position: 'absolute',
      flexDirection: 'column',
    };
    let list = functionList;
    if (!isArray(list)) {
      list = [list];
    }
    firstFuncList =
      list
        .map((item, key) => item.location)
        .filter((item) => item !== undefined) || {}; //过滤有location的func 返回坐标
    for (let i = 0; i < firstFuncList.length; i++) {
      if (
        firstFuncList[i].hasOwnProperty('startOffset') &&
        firstFuncList[i].hasOwnProperty('endOffset')
      ) {
      } else {
        Notice.alert({
          content: '配置location但未配置定位元素！',
          duration: 5000,
        });
        this.setState({
          useType4_1_0: false, //出错时 使用老版本
        });
        return;
      }
      //8*8
      let start = firstFuncList[i].startOffset.split(','); //未设置时返回最小单位
      let end = firstFuncList[i].endOffset.split(',');
      if (end[1] - start[1] < 0 || end[0] - start[0] < 0) {
        Notice.alert({
          content: '配置文件定位元素参数错误！',
          duration: 5000,
        });
        this.setState({
          useType4_1_0: false,
        });
        return;
      }
      let commonStyle = Object.assign({}, baseStyle);
      commonStyle.width = 92 + 130 * (end[1] - start[1]) + 'px';
      commonStyle.height = 80 + 118 * (end[0] - start[0]) + 'px';
      commonStyle.fontSize = firstFuncList[i].fontSize || 45 + 'px';
      if (106 + 130 * (end[1] - start[1]) > 236) {
        // 占用位置较小时，采用横向
        commonStyle.flexDirection = 'row';
      }
      if (useThemeVersion) {
        // todo
        // if (某条件下需要改成 row) {
        //   commonStyle.flexDirection = "row"
        // }
        commonStyle.borderRadius = '40px';
        commonStyle.background = 'transparent';
        // 原来的
        // let commonStyleWidth = 77 + 126 * (end[1] - start[1])
        // commonStyle.width = commonStyleWidth + "px"
        // commonStyle.height = (65 + 111 * (end[0] - start[0])) + "px"

        // 测试用 start
        let commonStyleWidth = 91 + 123 * (end[1] - start[1]);
        commonStyle.width = commonStyleWidth + 'px';
        commonStyle.height = 79 + 111 * (end[0] - start[0]) + 'px';
        commonStyle.top = '0px';
        commonStyle.left = '0px';
        // 添加宽度/高度级别
        commonStyle.cardWidthLevel = end[1] - start[1];
        commonStyle.cardheightLevel = end[1] - start[1];
        // 测试用 end

        // commonStyle.top = "9px"
        // commonStyle.left = "4px"
        commonStyle.fontSize = firstFuncList[i].fontSize || 44 + 'px';
        // commonStyle.justifyContent = 'flex-start' // 带小字时 // TODO
        commonStyle.justifyContent = 'center';
        commonStyle.paddingLeft = '48px';
        commonStyle.paddingRight = '48px';
        commonStyle.paddingTop = '0';
        commonStyle.paddingBottom = '0';
        commonStyle.boxSizing = 'border-box';
        if (commonStyleWidth <= 91 + 123 * 1) {
          // 宽度为2的  width
          commonStyle.paddingLeft = '0px';
          commonStyle.paddingRight = '0px';
          commonStyle.fontSize = firstFuncList[i].fontSize || 40 + 'px';
          commonStyle.justifyContent = 'center';
        }
      }
      // TODO
      if (useThemeVersion2) {
        // todo
        commonStyle.borderRadius = '12px';
        commonStyle.background = 'transparent';

        // 测试用 start
        let commonStyleWidth = 124 + 124 * (end[1] - start[1]);
        commonStyle.width = commonStyleWidth + 'px';
        commonStyle.height = 94 + 118 * (end[0] - start[0]) + 'px';
        commonStyle.top = '0px';
        commonStyle.left = '0px';
        // 添加宽度/高度级别
        commonStyle.cardWidthLevel = end[1] - start[1];
        commonStyle.cardheightLevel = end[1] - start[1];
        // 测试用 end

        // commonStyle.top = "9px"
        // commonStyle.left = "4px"
        commonStyle.fontSize = firstFuncList[i].fontSize || 44 + 'px';
        // commonStyle.justifyContent = 'flex-start' // 带小字时 // TODO
        commonStyle.justifyContent = 'center';
        commonStyle.paddingLeft = '48px';
        commonStyle.paddingRight = '48px';
        commonStyle.paddingTop = '0';
        commonStyle.paddingBottom = '0';
        commonStyle.boxSizing = 'border-box';
        if (commonStyleWidth <= 124 + 124 * 1) {
          // 宽度为2的  width
          commonStyle.paddingLeft = '0px';
          commonStyle.paddingRight = '0px';
          commonStyle.fontSize = firstFuncList[i].fontSize || 40 + 'px';
          commonStyle.justifyContent = 'center';
        }
      }
      styleList.push(commonStyle);
    }
    return styleList;
  };

  renderSecondFunc = () => {
    const { useThemeVersion = false } = this.props.config;
    const { secondFuncList = [] } = this.state;
    let temp = secondFuncList || [];

    if (secondFuncList.length > 4) {
      temp = secondFuncList.slice(0, 4);
      this.bench = secondFuncList.slice(4);
    }

    return (
      <Fragment>
        {temp.map((pageList, index) => {
          let pageListStyle = {};
          if (!!pageList.background) {
            pageListStyle = {
              // background: pageList.background,
              background: pageList.background,
              color: 'white',
            };
          }
          return (
            <div
              key={index}
              onClick={this.onFunctionClick.bind(this, pageList)}
              style={pageListStyle}
              className={`base410-second-func-item total-length-eq-${
                temp.length
              } ${pageList.available === false ? 'unavailable' : ''}`}
            >
              {!!pageList.iconIndex || !!pageList.iconIndexImgUrl ? (
                <div className='base410-second-func-item-1'>
                  <div>
                    {
                      pageList.background ? (
                        <img
                          src={
                            !!pageList.iconIndexImgUrl
                              ? pageList.iconIndexImgUrl
                              : useThemeVersion
                              ? iconIndexMapUseTheme[pageList.iconIndex]
                              : iconIndexMap[pageList.iconIndex]
                          }
                          alt=''
                        /> // 有背景色时
                      ) : (
                        <img
                          src={
                            !!pageList.iconIndexImgUrl
                              ? pageList.iconIndexImgUrl
                              : useThemeVersion
                              ? iconIndexSecondMap[pageList.iconIndex]
                              : iconIndexSecondMap[pageList.iconIndex]
                          }
                          alt=''
                        />
                      ) // 无背景色色时
                    }
                  </div>
                  <div className='base410-second-func-item-blank' />
                  <div>
                    <span>{pageList.label}</span>
                  </div>
                </div>
              ) : (
                <div className='base410-second-func-item-2'>
                  <span>{pageList.label}</span>
                </div>
              )}
            </div>
          );
        })}
        {this.bench.length > 0 ? (
          <div
            onClick={this.renderMoreFunc}
            className='base410-translate-funcs-button'
          >
            更多
          </div>
        ) : null}
      </Fragment>
    );
  };

  renderMoreFunc = () => {
    this.setState({
      showSecondList: true,
    });
  };

  handlePatientId = (patientId) => {
    const { standardDese = false } = this.props.config; //标准脱敏规则
    if (standardDese) {
      return (
        patientId.slice(0, 2) + '***' + patientId.slice(patientId.length - 4)
      );
    }
    return patientId;
  };

  getCardNoByCardType = (cardNo) => {
    const { isSongGangSheKang = false } = this.props.config;
    const { cardInfo = {} } = this.props.device;
    const { cardType = '' } = cardInfo;
    const { standardDese = false } = this.props.config; //标准脱敏规则
    if (standardDese) {
      let format =
        /^(([1][1-5])|([2][1-3])|([3][1-7])|([4][1-6])|([5][0-4])|([6][1-5])|([7][1])|([8][1-2]))\d{4}(([1][9]\d{2})|([2]\d{3}))(([0][1-9])|([1][0-2]))(([0][1-9])|([1-2][0-9])|([3][0-1]))\d{3}[0-9xX]$/;
      if (format.test(cardNo) || cardNo.length > 8) {
        //卡号=身份证号 & 八位以上 前四后四
        return cardNo.slice(0, 4) + '******' + cardNo.slice(cardNo.length - 4);
      } else if (cardNo.length <= 8) {
        //就诊卡号 八位以下 前二后四
        return cardNo.slice(0, 2) + '***' + cardNo.slice(cardNo.length - 4);
      }
    }

    if (window.hospitalId == '961') {
      return (
        cardNo.substring(0, 3) + '****' + cardNo.substring(cardNo.length - 3)
      );
    }
    if (window.hospitalId == '1312') {
      const { formatPatientCardWhenLengthGE10 = false } = this.props.config;
      if (formatPatientCardWhenLengthGE10) {
        const { info = {} } = this.props.user;
        let { patientCard = '' } = info;
        // 2020.10.31 新增 如为 社保卡 展示原卡号
        if (['10', '17', '18', '54'].includes(String(cardType))) {
          return patientCard;
        }
        let patientCardQrCodeTextLength = String(patientCard).length;
        if (patientCardQrCodeTextLength >= 10) {
          patientCard =
            String(patientCard).substring(0, 4) +
            '**' +
            String(patientCard).substring(patientCardQrCodeTextLength - 4);
        }
        return patientCard;
      }
      if (cardType == '1') {
        return cardNo.substring(0, 6) + '********' + cardNo.substring(14);
      }
    }
    if (window.hospitalId == '2600') {
      if (cardType == '24') {
        return (
          cardNo.substring(0, 4) +
          '********' +
          cardNo.substring(cardNo.length - 4)
        );
      }
    }
    if (
      ['157', '1310'].includes(String(window.hospitalId)) &&
      ['24'].includes(String(cardType))
    ) {
      const { info = {} } = this.props.user;
      const { idNo = '' } = info;
      return idNo.substring(0, 4) + '****' + idNo.substring(idNo.length - 4);
    }
    if (
      ['157', '162', '163', '1310', '900'].includes(String(window.hospitalId))
    ) {
      if (cardType == '1') {
        return (
          cardNo.substring(0, 4) +
          '********' +
          cardNo.substring(cardNo.length - 4)
        );
      }
    }
    if (isSongGangSheKang && cardType == '10') {
      // 松岗社康且为社保卡，因社保卡卡号加密 只能展示身份证号
      const { info = {} } = this.props.user;
      const { idNo = '' } = info;
      if (!!idNo) {
        return idNo.substring(0, 4) + '****' + idNo.substring(idNo.length - 4);
      }
      return '';
    }
    if (['167', '170'].includes(String(window.hospitalId))) {
      if (cardNo.length <= 8) {
        return (
          cardNo.substring(0, 2) + '****' + cardNo.substring(cardNo.length - 4)
        );
      } else {
        return (
          cardNo.substring(0, 2) + '****' + cardNo.substring(cardNo.length - 4)
        );
      }
    }
    return cardNo;
  };
  getPatientName = (userName) => {
    if (['167', '170', '150'].includes(String(this.hospitalId))) {
      userName = noPassByNameExart(userName);
      return userName;
    }
    userName = handlePatientNameDesensitization(userName);
    return userName;
  };

  // 580 首页顶部个人信息展示
  renderTitle410 = () => {
    let {
      showPatientName = true,
      showCardNo = true,
      showAccBalance = true,
      showPatientId = false,
      showUserId = false,
      useTodoDrawer = false,
      showExitCard = true,
      useForcePayFor580 = false,
      showDeseName = false,
      showUserAge = false,
      showUserSex = false,
      showPatientType = false,
      showPatientTypePrefix = '病人类型:',
    } = this.props.config;
    let { info = {} } = this.props.user;
    const { info: userInfo = {} } = this.props.user;
    let {
      accBalance = '',
      cardNo = '',
      patientName = '',
      userId = '',
      patientId = '',
      name = '',
    } = info;
    let finalName = name || patientName;
    let { cardInfo = {} } = this.props.device;
    let { forcePayCompleted = false } = this.state;
    let exitBtnStatus = showExitCard;
    if (
      ['1040', '1045'].includes(String(window.hospitalId)) &&
      useForcePayFor580 &&
      !forcePayCompleted
    ) {
      exitBtnStatus = false;
    }
    let cardNoText = this.getCardNoByCardType(info.cardNo || cardNo || '');
    let patientType = userInfo.patientType || '';
    let patientTypeName = userInfo.extendMap
      ? userInfo.extendMap.patientTypeName || ''
      : '';
    if (['162'].includes(String(window.hospitalId))) {
      patientType = patientTypeName;
    }
    if (['170', '167'].includes(String(window.hospitalId))) {
      finalName = noPassByNameExart(finalName) || '';
    }
    if (['948'].includes(String(window.hospitalId))) {
      const { cardInfo = {} } = this.props.device;
      cardNoText = cardInfo.deviceCardNo || '';
    }
    if (['2007'].includes(String(window.hospitalId))) {
      patientId = userId;
    }
    let deseName = patientName || name || '';
    let patientIdText = this.handlePatientId(patientId);

    return (
      <div className='index-info-base410-item'>
        {showPatientName && !showDeseName && (
          <span className='index-info-base410-item-1'>
            {this.getPatientName(deseName || '')}
          </span>
        )}
        {showPatientName && showDeseName && (
          <span className='index-info-base410-item-1'>{finalName || ''}</span>
        )}
        {showCardNo && !!cardNoText && (
          <span className='index-info-base410-item-2'>卡号：{cardNoText}</span>
        )}
        {showUserId && !!userId && (
          <span className='index-info-base410-item-2'>
            门诊号：{userId || ''}
          </span>
        )}
        {showPatientId && !!patientId && (
          <span className='index-info-base410-item-2'>
            门诊号：{patientIdText || ''}
          </span>
        )}
        {showAccBalance && 'accBalance' in userInfo && (
          <span className='index-info-base410-item-2'>
            余额：{(Number(accBalance) / 100).toFixed(2) || ''}元
          </span>
        )}
        {showUserSex && (
          <span className='index-info-base410-item-2'>
            &nbsp;&nbsp;&nbsp;性别:{userInfo.sex}
          </span>
        )}
        {showUserAge && (
          <span className='index-info-base410-item-2'>
            &nbsp;&nbsp;&nbsp;年龄:{userInfo.age || ''}
          </span>
        )}
        {showPatientType && !!patientType && (
          <span className='index-info-base410-item-2'>
            {showPatientTypePrefix}
            {patientType}
          </span>
        )}
        {useTodoDrawer && this.renderWaitToDo()}
        {exitBtnStatus && this.renderExitCardBtnSlot()}
      </div>
    );
  };

  renderWaitToDo = () => {
    // return null
    const { user = {} } = this.props;
    const {
      useTodoDrawer = false,
      todoDrawerBtnOpt = false,
      useThemeVersion = false,
    } = this.props.config;
    if (useThemeVersion) {
      // 对应展示逻辑在 src/component/base/FixedUserInfo.js
      return;
    }
    const { saveList = [] } = this.props.store;
    let count = saveList.length || 0;
    let todoDrawerBtnOptBool = !todoDrawerBtnOpt || !!(saveList.length > 0); // 待办为空 按钮隐藏
    if (useTodoDrawer && user.isLogin && todoDrawerBtnOptBool) {
      return (
        <Fragment>
          <div className='index-info-base410-red-count'>{count}</div>
          <Button
            className={`index-info-base410-waittoDo ${
              saveList.length == '0' ? 'unavailable' : ''
            }`}
            onTouchEnd={() => this.toggleDrawer()}
          >
            待办
          </Button>
        </Fragment>
      );
    }
    return null;
  };

  cancelSecondList = () => {
    this.setState({
      showSecondList: false,
    });
  };

  // 展示更多，或注意事项位置
  renderMoreSlot = () => {
    const { useThemeVersion2 = false } = this.props.config;
    let indexPage = this.props.config.indexPage || {};
    let noticeConfig410 = indexPage.notice_4_1_0 || {};
    const { secondFuncList = [] } = this.state;
    if (useThemeVersion2) {
      return null;
    }
    if (
      ['345', '261', '346', '344', '341'].includes(String(window.hospitalId))
    ) {
      return null;
    }
    return (
      <div
        className={`new-index-active-functions-box total-length-eq-${secondFuncList.length}`}
      >
        {!!secondFuncList.length ? (
          this.renderSecondFunc()
        ) : (
          <IndexNotice410 {...noticeConfig410} />
        )}
      </div>
    );
  };

  render() {
    let {
      drawerVisible,
      showSecondList = false,
      checkoutLoading = false,
      secondFuncList = [],
      queryUserInfoLoading = false,
      forcePay = false,
    } = this.state;
    let { useType4_1_0 = false } = this.props.config;
    let { globalLoading = false } = this.props;
    let {
      todoDrawerJudge = false,
      showHeaderTime = true,
      removeUserInfoIndex = false,
      forceIndexPage = false,
    } = this.props.config || {};
    let indexPage = this.props.config.indexPage || {};
    let todoDrawer = this.props.config.todoDrawer || {};
    let user = this.props.user || {};
    let { showTips, click } = this.state;
    const { useForcePayFor580 = false } = this.props.config;
    let noticeConfig = indexPage.notice || {};
    let specialStyle = this.Style || [];
    let {
      useThemeVersion = false, // 是否使用580新主题，默认false
      useReadingPageAsIndex = false, // 是否使用 读卡动画作为新的首页， 即，首页轮询，并在查询到病人信息后 展示主页, 默认为false
      useTodoDrawer = true,
      showForceExitCardBtn = false,
      showForceExitCardBtnForV420 = false, // v4_2_0.html 是否展示 强制退卡按钮
      useUserInfoScanner = false,
      userInfoScannerList = false,
      usePureColorForIndexPage = false,
    } = this.props.config;
    let { carReadResult = {}, cardInfo = {} } = this.props.device;
    let { cardType = '' } = cardInfo;
    let functionList = toFixedColumns(
      indexPage['function'] || [],
      indexPage.functionColumns
    );
    let { infoIndex } = this.getLayout({
      showHeaderTime,
      // removeUserInfoIndex,
      isLogin: user.isLogin,
      forceIndexPage,
    });
    let fixedFuncList = indexPage['function'] || []; //4.1.0
    if (!isArray(fixedFuncList)) {
      fixedFuncList = new Array(fixedFuncList);
    }
    fixedFuncList = fixedFuncList.filter((item) => !!item.location) || {}; //过滤有location的func 返回func

    let specialMainStyle = this.mainStyleList || [];
    //4.0签到屏  湖州中心用
    const { forSign = false } = this.props.config;
    if (forSign) {
      return <SignPage />;
    }
    return (
      <div>
        {/* 2021.02.25 新增的 硬件检测展示 */}
        <HardwareMonitorSlot />
        {/* 通用部分 start */}
        {showTips && (
          <Tips
            showTips={showTips}
            click={click}
            handleCancel={this.handleCancel.bind(this)}
            handleComfirm={this.handleComfirm.bind(this)}
          />
        )}
        {useReadingPageAsIndex && this.props.store.showReadgingPageAsIndex && (
          <IndexReadingPage />
        )}
        {(checkoutLoading || globalLoading || queryUserInfoLoading) && (
          <Loading />
        )}
        {useUserInfoScanner && !!userInfoScannerList && <UserInfoScanner />}
        {/* 通用部分 end */}
        {useType4_1_0 ? (
          <Fragment>
            {<UserElectronicCardScanner />}
            {useForcePayFor580 && forcePay && this.ForcePayFor1040()}
            {!carReadResult.success ? (
              <div className='new-indexpage-base410-title-contianer'>
                <div className='new-indexpage-base410-title'>
                  请选择您要办理的业务
                </div>
                {showForceExitCardBtnForV420 && (
                  <Button
                    className='new-indexpage-base410-CardCheckout-in-title-container'
                    onTouchEnd={() => this.handleForceExitCard()}
                  >
                    强制退卡
                  </Button>
                )}
              </div>
            ) : (
              infoIndex && this.renderTitle410()
            )}
            <div className='new-indexpage-base410-card'>
              {!!fixedFuncList.length &&
                fixedFuncList.map((item, key) => {
                  let num = key - 6;
                  // 卡纸条件：目前以义乌中心医院1002为准
                  return (
                    <div
                      key={key}
                      style={specialMainStyle[key]}
                      className={`
                ${
                  item.hardwareStatus_receipt === false &&
                  item.hardwareCode_receipt === 1
                    ? 'PE'
                    : ''
                } 
                ${
                  item.hardwareStatus_receipt === true &&
                  item.hardwareCode_receipt === 8
                    ? 'PJ'
                    : ''
                } 
                ${
                  item.hardwareStatus_report === false &&
                  item.hardwareCode_report === 1
                    ? 'PE'
                    : ''
                } 
                ${
                  item.hardwareStatus_report === false &&
                  item.hardwareCode_receipt === 8
                    ? 'PJ'
                    : ''
                }
                base410-func-parent-item 
                ${
                  usePureColorForIndexPage
                    ? 'base410-func-parent-item-pure-color'
                    : ''
                }
                ${item.available === false ? 'function-unavailable' : ''} 
                ${useThemeVersion ? 'use-theme' : ''}
                ${
                  !!item.location.background
                    ? `base410-func-parent-item-${item.location.background}`
                    : `base410-func-parent-item-${key >= 6 ? num : key}`
                }`}
                    >
                      <div
                        data-use-asr
                        key={key}
                        onClick={this.onFunctionClick.bind(this, item)}
                        className={`special-func-item-base410 ${
                          (specialStyle[key] || {}).cardWidthLevel <= 1
                            ? 'card-width-level-lte-1'
                            : ''
                        } ${
                          !!item.location.background
                            ? `base410-func-item-${item.location.background}`
                            : `base410-func-item-${key >= 6 ? num : key}`
                        }`}
                        style={specialStyle[key]}
                      >
                        <div
                          className={`special-func-item-space-base410 ${
                            useThemeVersion ? 'use-theme' : ''
                          }`}
                        >
                          <img
                            className={`special-func-item-space-base410-icon ${
                              useThemeVersion ? 'use-theme' : ''
                            }`}
                            src={
                              useThemeVersion
                                ? iconIndexMapUseTheme[item.iconIndex]
                                : iconIndexMap[item.iconIndex]
                            }
                            alt=''
                          />
                        </div>
                        <div>
                          <span>{item.label}</span>
                        </div>
                        {item.funcTips && (
                          <div
                            className='special-func-item-space-base410-tips'
                            style={item.funcTipsStyle || {}}
                            dangerouslySetInnerHTML={{ __html: item.funcTips }}
                          ></div>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
            {this.renderMoreSlot()}
            {/* 点击显示二级功能栏 */}
            {showSecondList && (
              <div className='base410-index-second-functions-onShadow'>
                <div className='base410-index-more-second-funcs'>
                  <div className='base410-index-more-second-func-title'>
                    更多功能
                  </div>
                  {/* <div className="base410-index-more-second-func-coundown"></div> */}
                  <div className='base410-index-more-second-func-content'>
                    {this.bench.map((item, index) => {
                      return (
                        <div
                          key={index}
                          data-use-asr
                          onClick={this.onFunctionClick.bind(this, item)}
                          className='base410-index-more-second-func-item'
                        >
                          {!!item.iconIndex || !!item.iconIndexImgUrl ? (
                            <div className='base410-second-func-item-3'>
                              <div>
                                <img
                                  className='base410-second-func-item-img'
                                  src={
                                    !!item.iconIndexImgUrl
                                      ? item.iconIndexImgUrl
                                      : useThemeVersion
                                      ? iconIndexSecondMap[item.iconIndex]
                                      : iconIndexSecondMap[item.iconIndex]
                                  }
                                  alt=''
                                />
                              </div>
                              <div>
                                <span>{item.label}</span>
                              </div>
                            </div>
                          ) : (
                            <div className='base410-second-func-item-4'>
                              <span>{item.label}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <Button
                    className='base410-second-func-item-cancel-button'
                    onTouchEnd={this.cancelSecondList}
                  >
                    返回
                  </Button>
                </div>
              </div>
            )}
            {(!todoDrawerJudge || this.state.todoDrawerJudge) &&
              useTodoDrawer &&
              !useThemeVersion &&
              carReadResult.success &&
              user.isLogin &&
              todoDrawer &&
              Object.keys(todoDrawer).length > 0 && (
                <TodoDrawer visible={drawerVisible} {...todoDrawer} />
              )}
            {showForceExitCardBtn &&
              ['1040', '1045'].includes(String(window.hospitalId)) && (
                <button
                  className='base410-force-exit-card'
                  onClick={this.handleForceExitCard}
                >
                  强制退卡
                </button>
              )}
            {/* 更多功能 */}
            {this.state.moreFunctionsCard && (
              <SubPageModal
                title='更多功能'
                handleSubPageModalClose={() =>
                  this.setState({ moreFunctionsCard: false })
                }
                hideConfirm={false}
              >
                <MoreFunctions
                  onFunctionClick={this.onFunctionClick.bind(this)}
                />
              </SubPageModal>
            )}
          </Fragment>
        ) : (
          <Fragment>
            <IndexNotice {...noticeConfig} />
            <div className={indexPage.functionContainerClass}>
              {functionList.map((func, k) =>
                func ? (
                  <Card
                    key={k}
                    {...func}
                    onClick={this.onFunctionClick.bind(this, func)}
                    // className={indexPage.functionClass}
                    className={`${indexPage.functionClass} ${
                      func.available === false ? 'unavailable' : ''
                    }`}
                    activeClass={indexPage.functionActiveClass}
                  />
                ) : (
                  <div key={k} className={indexPage.functionClass + '-fixed'} />
                )
              )}
            </div>
            <div className='row-flex row-flex-center index-page-footer-btn'>
              {showForceExitCardBtn && (
                <button
                  className='blue-button index-page-footer-force-exit-btn'
                  onClick={this.handleForceExitCard}
                >
                  强制退卡
                </button>
              )}
              {this.renderExitCardBtnSlot()}
            </div>
            {useTodoDrawer &&
              !useThemeVersion &&
              carReadResult.success &&
              user.isLogin &&
              todoDrawer &&
              Object.keys(todoDrawer).length > 0 && (
                <TodoDrawer
                  // visible={!drawerVisible ? (drawerVisible) : (drawerVisible || this.state.drawerFlag)}
                  visible={drawerVisible}
                  // forceVisible={this.state.drawerFlag}
                  // closeDrawer={this.closeDrawer}
                  // openDrawer={this.openDrawer}
                  // toggleDrawer={this.toggleDrawer}
                  {...todoDrawer}
                />
              )}
          </Fragment>
        )}
      </div>
    );
  }
}

export default connect((state) => {
  return {
    config: state.config,
    globalLoading: state.store.globalLoading || false,
    user: state.user,
    device: state.device,
    store: state.store,
    polling: state.polling,
    scan: state.scan,
    registration: state.registration,
    deviceExtra: state.deviceExtra,
    pay: state.pay,
    payment: state.payment,
    cardChecker: state.cardChecker,
    jhRegRecord: state.jhRegRecord,
    inHos: state.inHos,
    inHosSelf: state.inHosSelf,
    creditPay: state.creditPay,
  };
})(IndexPage);
