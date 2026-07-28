import { defHttp } from '@/utils/http';
enum Api {
    getCodestoreConfig = '/datacenter/configuration/getCodestoreConfig',
    getEmail = '/datacenter/configuration/getEmail',
    saveEmail = '/datacenter/configuration/saveEmail',
    saveCodeStoreConfig = '/datacenter/configuration/saveCodeStoreConfig',
    upConfigStatus = '/datacenter/configuration/upConfigStatus',
    //应用配置
    getConfig = '/datacenter/configuration/getAppConfig',
    saveConfig = '/datacenter/configuration/saveAppConfig',
}

//获取代码仓代码数据
export function getCodestoreConfig(params: object) {
  return defHttp.get({ url: Api.getCodestoreConfig, params:params }, { errorMessageMode: 'message' });
}
//列表数据
export function getEmail(params: object) {
  return defHttp.get({ url: Api.getEmail, params:params }, { errorMessageMode: 'message' });
}
//提交数据
export function saveEmail(params: object) {
    return defHttp.post({ url: Api.saveEmail, params:params}, { errorMessageMode: 'message' });
}
//修改代码仓配置
export function saveCodeStoreConfig(params: object) {
    return defHttp.post({ url: Api.saveCodeStoreConfig, params:params}, { errorMessageMode: 'message' });
}
//修改代码仓配置
export function upConfigStatus(params: object) {
    return defHttp.post({ url: Api.upConfigStatus, params:params}, { errorMessageMode: 'message' });
}

//应用-列表数据
export function getConfig(params: object) {
  return defHttp.get({ url: Api.getConfig, params:params }, { errorMessageMode: 'message' });
}

//应用-提交数据
export function saveConfig(params: any) {
    if(params.fileSize){
        params.fileSize= parseFloat(params.fileSize)*pow1024(3)
    }
    return defHttp.post({ url: Api.saveConfig, params:params}, { errorMessageMode: 'message' });
}
// 求次幂
function pow1024(num:number) {
    return Math.pow(1024, num)
}

/**数据类型 */
export interface menuItem {
    id:number,
    title: string;
    status: Boolean;
    name: string;
    pluginident: string;
    data:DataObj[];
}

export interface DataObj {
    keyname: string;
    keyvalue: string;
    keyfield: string;
}
