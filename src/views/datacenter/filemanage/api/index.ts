
import { defHttp } from '@/utils/http';
import { FilterParam } from '/@/utils';
enum Api {
  getList = '/datacenter/filemanage/getList',
  getFileInfo = '/datacenter/filemanage/getFileInfo',
}

//列表附件列表数据
export function getList(params: any) {
  params=FilterParam(params)
  return defHttp.get({ url: Api.getList, params:params }, { errorMessageMode: 'none' });
}
//获取存储数据
export function getFileInfo(params: any) {
  return defHttp.get({ url: Api.getFileInfo, params:params }, { errorMessageMode: 'none' });
}


/** 系统文件类型 */
export type FileItem = {
    id: string
    title: string
    name: string
    filesize: number
    url: string
    mimetype: string
    extension: string
    type: number
    storageId: string
    createUserString: string
    created_at: string
    updateUserString: string
  }
  /** 分页请求数据格式 */
  interface PageQuery {
    page: number
    size: number
  }
  
  export interface FileQuery {
    title?: string
    name?: string
    type?: string
    sort: string//Array<string>
  }
  export interface FilePageQuery extends FileQuery, PageQuery {}