export interface FileTypeListItem {
  name: string
  value: string
  icon: string
}

/** 文件分类 */
export const FileTypeList: FileTypeListItem[] = [
  { name: '全部', value: 'all', icon: 'svgfont-file_all' },
  { name: '图片', value: '0', icon: 'svgfont-tupian2' },
  { name: '文档', value: '4', icon: 'svgfont-wenbenwendang-txt' },
  { name: '视频', value: '2', icon: 'svgfont-shipin1' },
  { name: '音频', value: '3', icon: 'svgfont-yinpin2' },
  { name: '其他', value: '5', icon: 'svgfont-qitawenjian' }
]

export interface FileExtendNameIconMap {
  [key: string]: string
}

/** 文件类型图标 Map 映射 */
export const FileIcon: FileExtendNameIconMap = {
  mp3: 'svgfont-yinpin',
  mp4: 'svgfont-shipin1',
  dir: 'svgfont-wenjianjia-1',
  ppt: 'file-ppt',
  doc: 'svgfont-wendang-docx_doc',
  docx: 'svgfont-wps',
  xls: 'svgfont-XLS',
  xlsx: 'svgfont-XLS',
  txt: 'svgfont-wenbenwendang-txt',
  rar: 'svgfont-yasuowenjian',
  zip: 'svgfont-yasuowenjian',
  html: 'svgfont-HTMLtubiao',
  css: 'svgfont-css',
  js: 'svgfont-js',
  other: 'svgfont-qitawenjian' // 未知文件
}

/** 图片类型 */
export const ImageTypes = ['image/jpg', 'image/png', 'image/gif', 'image/jpeg',"image/x-icon"]

/** 视频类型 */
export const VideoTypes = ['video/mp4', 'video/x-flv', '	video/MP2T', 'video/3gpp', 'video/quicktime', 'video/x-msvideo', 'video/x-ms-wmv']

/** WPS、Office文件类型 */
export const OfficeTypes = ['txt','ppt', 'pptx', 'doc', 'docx', 'xls', 'xlsx','zip','rar','html','css','js']

/** 音频类型 */
export const AudioTypes = ['mp3','ram','wav']