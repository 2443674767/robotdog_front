/** 驾驶舱占位数据，后续接真实接口时替换本文件 */

export const statCards = [
  { label: '今日巡检', value: 128, unit: '次', trend: '+12%' },
  { label: '待处理告警', value: 9, unit: '条', trend: '-3' },
  { label: '完成率', value: 92.6, unit: '%', trend: '+1.2%' },
];

export const inspectPieData = [
  { name: '已完成', value: 86 },
  { name: '进行中', value: 28 },
  { name: '未开始', value: 14 },
  { name: '异常终止', value: 6 },
];

export const alarmTrend = {
  dates: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
  critical: [3, 5, 2, 6, 4, 1, 2],
  warning: [8, 12, 9, 15, 11, 7, 10],
};

export const inspectBar = {
  areas: ['一号区域', '二号区域', '三号区域', '四号区域', '五号区域'],
  completed: [32, 28, 41, 19, 25],
  pending: [5, 8, 3, 12, 6],
};

export const realtimeMessages = [
  { id: 1, time: '10:32:18', level: '告警', content: '三号区域摄像头离线，请检查网络' },
  { id: 2, time: '10:28:05', level: '通知', content: '巡检任务「东区日常巡检」已完成' },
  { id: 3, time: '10:21:44', level: '告警', content: '检测到异常闯入，已推送告警' },
  { id: 4, time: '10:15:02', level: '通知', content: '设备 SJ-CAM-08 重新上线' },
  { id: 5, time: '10:08:37', level: '预警', content: '四号区域巡检超时未完成' },
  { id: 6, time: '09:56:11', level: '通知', content: '新巡检计划已下发至 12 台设备' },
  { id: 7, time: '09:42:29', level: '告警', content: '存储空间不足，录像可能中断' },
  { id: 8, time: '09:30:00', level: '通知', content: '系统例行健康检查通过' },
];
