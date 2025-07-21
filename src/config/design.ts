export type LayoutType = 'vertical';

// 仿豆包折叠逻辑
export type CollapseType
  = | 'alwaysCollapsed' // 始终折叠
    | 'followSystem' // 跟随系统视口宽度
    | 'alwaysExpanded' // 始终打开
    | 'narrowExpandWideCollapse'; // 系统视口 宽小则张，宽大则收

export interface DesignConfigState {
  // 系统主题
  darkMode: 'light' | 'dark' | 'inverted';
  // 系统主题色
  themeColor: string;
  // 系统内置风格
  themeColorList: string[];
  // 是否开启路由动画
  isPageAnimate: boolean;
  // 路由动画类型
  pageAnimateType: string;
  // 布局模式 (纵向：vertical | ... | 自己定义)
  layout: LayoutType;
  // 折叠类型
  collapseType: CollapseType;
  // 是否折叠菜单
  isCollapse: boolean;
  // 安全区是否被悬停
  isSafeAreaHover: boolean;
  // 跟踪是否首次激活悬停
  hasActivatedHover: boolean;
}

export const themeColorList: string[] = [
  '#5d9dfe',
  '#2d8cf0',
  '#0960bd',
  '#0084f4',
  '#009688',
  '#536dfe',
  '#ff5c93',
  '#ee4f12',
  '#0096c7',
  '#9c27b0',
  '#ff9800',
  '#FF3D68',
  '#00C1D4',
  '#18a058',
  '#78DEC7',
  '#1768AC',
  '#FB9300',
  '#FC5404',
  '#8675ff',
];

const design: DesignConfigState = {
  // 深色主题
  darkMode: 'light',
  // 系统主题色
  themeColor: '#F7B51C',
  // 系统内置主题色列表
  themeColorList,
  // 是否开启路由动画
  isPageAnimate: false,
  // 路由动画类型
  // 需要自定义路由动画可以把 Main 组件样式代码注释放开，从新对话切换到带id的路由时，会执行这个动画样式
  pageAnimateType: 'zoom-fade',
  // 布局模式 (纵向：vertical | ... | 自己定义)
  layout: 'vertical',
  // 折叠类型
  collapseType: 'followSystem',
  // 是否折叠菜单
  isCollapse: false,
  // 安全区是否被悬停
  isSafeAreaHover: false,
  // 跟踪是否首次激活悬停
  hasActivatedHover: false,
};

export default design;
