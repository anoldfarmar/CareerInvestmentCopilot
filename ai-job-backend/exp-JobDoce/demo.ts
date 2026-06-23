/**
 * 1. 定义一级职位类别（Main Category）的联合类型
 */
export type JobMainCategory =
  | '研发'
  | '运营'
  | '产品'
  | '职能_支持' // 为避免特殊字符/，用下划线替代键名，展示时可映射为 '职能/支持'
  | '销售'
  | '设计'
  | '市场'
  | '游戏策划'
  | '教研教学';

/**
 * 2. 定义各分类下岗位方向（Sub Direction）的联合类型
 */
export type RecordSubDirection = '后端' | '前端' | '大数据' | '测试' | '算法' | '客户端' | '基础架构' | '多媒体' | '安全' | '计算机视觉' | '数据挖掘' | '运维' | '自然语言处理' | '机器学习' | '硬件';
export type OperationsSubDirection = '商业运营' | '审核' | '用户运营' | '内容运营' | '频道运营' | '产品运营' | '销售运营' | '编辑' | '内容引进' | '客服' | '游戏运营' | '项目管理';
export type ProductSubDirection = '产品经理' | '商业产品(广告)' | '数据分析';
export type FunctionalSubDirection = '法务' | '战略' | '人力' | '财务' | '行政设施' | 'IT支持' | '采购' | '投资' | '内审';
export type SalesSubDirection = '销售' | '销售支持' | '销售专员' | '销售管理';
export type DesignSubDirection = 'UI' | '平面设计' | '交互设计' | '视觉设计' | '用户研究' | '多媒体设计' | '3D动效' | '游戏美术';
export type MarketSubDirection = '广告投放' | '营销策划' | 'PR' | '品牌' | '政府关系' | '商务拓展BD' | '媒介公关';
export type GamePlanningSubDirection = '游戏系统策划' | '游戏数值策划' | '游戏剧情策划' | '游戏音频策划';
export type EducationSubDirection = '教研' | '主讲' | '课程辅导' | '教务管理';

/**
 * 3. 定义统一的子岗位方向联合类型
 */
export type JobSubDirection =
  | RecordSubDirection
  | OperationsSubDirection
  | ProductSubDirection
  | FunctionalSubDirection
  | SalesSubDirection
  | DesignSubDirection
  | MarketSubDirection
  | GamePlanningSubDirection
  | EducationSubDirection;

/**
 * 4. 使用满足强类型约束的只读对象（映射表）
 * 确保每个一级分类下的数组，只能填入属于该分类的二级岗位
 */
export const JOB_NESTED_RELATION: Record<JobMainCategory, readonly JobSubDirection[]> = {
  研发: [
    '后端', '前端', '大数据', '测试', '算法', '客户端', 
    '基础架构', '多媒体', '安全', '计算机视觉', '数据挖掘', 
    '运维', '自然语言处理', '机器学习', '硬件'
  ] as const,
  
  运营: [
    '商业运营', '审核', '用户运营', '内容运营', '频道运营', 
    '产品运营', '销售运营', '编辑', '内容引进', '客服', 
    '游戏运营', '项目管理'
  ] as const,
  
  产品: [
    '产品经理', '商业产品(广告)', '数据分析'
  ] as const,
  
  职能_支持: [
    '法务', '战略', '人力', '财务', '行政设施', 
    'IT支持', '采购', '投资', '内审'
  ] as const,
  
  销售: [
    '销售', '销售支持', '销售专员', '销售管理'
  ] as const,
  
  设计: [
    'UI', '平面设计', '交互设计', '视觉设计', 
    '用户研究', '多媒体设计', '3D动效', '游戏美术'
  ] as const,
  
  市场: [
    '广告投放', '营销策划', 'PR', '品牌', 
    '政府关系', '商务拓展BD', '媒介公关'
  ] as const,
  
  游戏策划: [
    '游戏系统策划', '游戏数值策划', '游戏剧情策划', '游戏音频策划'
  ] as const,
  
  教研教学: [
    '教研', '主讲', '课程辅导', '教务管理'
  ] as const,
} as const;

/**
 * 5. UI 展示映射字典（用于界面上展示漂亮的名字）
 */
export const JOB_MAIN_CATEGORY_LABELS: Record<JobMainCategory, string> = {
  研发: '研发',
  运营: '运营',
  产品: '产品',
  职能_支持: '职能/支持',
  销售: '销售',
  设计: '设计',
  市场: '市场',
  游戏策划: '游戏策划',
  教研教学: '教研教学',
};

/**
 * 6. 工具函数：根据所选的一级分类，获取联动对应的二级岗位列表
 * @param mainCategory 一级职位类别
 * @returns 二级岗位方向数组
 */
export function getSubDirections(mainCategory: JobMainCategory): readonly JobSubDirection[] {
  return JOB_NESTED_RELATION[mainCategory] || [];
}

/**
 * 7. 投递卡片对象的类型定义示例（供管理模块参考使用）
 */
export interface JobApplicationTicket {
  id: string;
  companyName: string;                     // 公司名称
  mainCategory: JobMainCategory;           // 录入的一级类别
  subDirection: JobSubDirection;           // 录入的二级方向
  status: '初筛中' | '面试中' | '已录取' | '不通过'; // 投递状态
  updatedAt: string;                       // 更新时间
}