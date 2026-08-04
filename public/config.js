const domain="";//您的域名//独立部署需要填写Go服务api接口域名(部署在Go目录下可以留空)
const localhost="http://localhost:8500";//访问本地的域名和端口，如果您改变Go服务端口，请自行修改
// const localhost="http://192.168.2.34:8500";
window.globalConfig = {
	Main_url:`${domain}`,//域名
	Main_url_dev:`${localhost}`,//域名
	Root_url:`${domain}/admin`,//Api服务器域名
    Root_url_dev:`${localhost}/admin`,//Api服务器域名-开发环境
	Upload_url:`${domain}/common`,//Api服务器域名
    Upload_url_dev:`${localhost}/common`,//Api服务器域名-开发环境
	AppTitle_zhCN:"思极智巡",
    AppTitle_zhTW:"思極智巡",
	AppTitle_enUS:"Sijizhixun",
    CompanySite:"//siji.cn/",//公司官网
    ICP:"浙江",//备案号
    Company:"浙江思极",//公司名称
    Address:"中国·杭州",
    
    TeamSite:"//siji.cn/",//技术团队官网
    Team:"思极实验室",//技术团队，没有则填空""
    loginTitle_zhCN:`Go语言开发用<span class="sub-title">GoFlyGen框架</span>`,
    loginTitle_zhTW:`Go語言開發用<span class="sub-title">GoFlyGen框架</span>`,
    loginTitle_enUS:`<span class="sub-title">GoFlyGen</span> framework is used for Go development`,
    loginDesc_zhCN:["开发效率高","基础功能完善","开发文档全面"],
    loginDesc_zhTW:["開發效率高","基礎功能完善","開發文檔全面"],
    loginDesc_enUS:["High development efficiency","Complete basic functions","Comprehensive development documentation"],
    Copyright:"思极实验室提供技术支持",
    RouterHome:"home",//路由默认入口
    MaxSizeImage:5,//最大上传图片大小,单位M
	MaxSizeVideo:150,//最大上传视频大小,单位M
    //DefaultAccountPassword:["admin","admin888"],//演示账号密码值为：["admin","admin888"]，正式项目请修改为空数组-即值为：[]
    DefaultAccountPassword:["amon", "123"],
    // ========== 视频：ZLMediaKit HTTP-FLV ==========
    RtspVisible: "rtsp://10.21.31.111/live/main",
    RtspThermal: "rtsp://10.21.31.111/live//thermal",
    StreamPlayUrl: "http://localhost:8080/robotdog/m20_camera.live.flv",
    StreamPlayUrlVisible: "http://localhost:8080/robotdog/m20_camera.live.flv",
    StreamPlayUrlThermal: "http://localhost:8080/robotdog/m20_thermal.live.flv",
    VideoStreams: [
      {
        key: "visible",
        label: "可见光",
        rtsp: "rtsp://10.21.31.111/live/main",
        playUrl: "http://localhost:8080/robotdog/m20_camera.live.flv",
      },
      {
        key: "thermal",
        label: "红外",
        rtsp: "rtsp://10.21.31.111/live//thermal",
        playUrl: "http://localhost:8080/robotdog/m20_thermal.live.flv",
      },
    ],
    RtspUrl: "rtsp://10.21.31.111/live/main",
    WebRtcMode: "go2rtc",
    WebRtcGateway: "",
    // ========== 设备地图服务（仅 IP/端口；接口路径在 robotdog/waypoint API 内）==========
    RobotMapApiIp: "10.21.31.100",
    RobotMapApiPort: 9000,
};
