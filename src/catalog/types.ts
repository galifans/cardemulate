/**
 * 目录层类型：站点（app）-> 品类 -> 发行商 -> 系列 -> 盒型。
 *
 * 这一层只描述「有什么」，不关心「怎么拆」。真正做到两边解耦后，
 * 新增一个品类 / 发行商 / 盒型都只是加数据，不用改视图。
 */

/** 一个站点/项目（未来会有多个娱乐站点共用一套账号与统计） */
export interface AppDef {
    /** 站点 key，写入数据库 app 字段 */
    key: string;
    /** 展示名 */
    name: string;
    /** 线上域名 */
    host: string;
    /** 一句话说明 */
    description: string;
    /** 是否为当前站点 */
    current?: boolean;
}

/** 品类（运动 / IP） */
export interface CategoryDef {
    key: string;
    name: string;
    nameEn: string;
    /** 首页图标 key，见 components/CategoryIcon.vue */
    icon: string;
    tagline: string;
    /** 排序，越小越前 */
    order: number;
    /** 是否已有可拆的盒型（由已注册数据推导） */
    live: boolean;
    /** 已上线内容的说明文案 */
    feature?: string;
    /** 该品类下已注册的盒型数量 */
    boxCount: number;
}

/** 发行商 */
export interface MakerDef {
    key: string;
    name: string;
    nameEn: string;
    /** 排序 */
    order: number;
    live: boolean;
    note: string;
    /** 该发行商下已注册的盒型数量 */
    boxCount: number;
}

/** 盒子引用（目录里的一条指针，指向 engine 层的 BoxDefinition） */
export interface BoxRef {
    /** boxKey，与 BoxDefinition.key 一致 */
    ref: string;
    slug: string;
    name: string;
    live: boolean;
    note: string;
}

/** 系列 / 产品 */
export interface ProductDef {
    key: string;
    name: string;
    category: string;
    maker: string;
    order: number;
    live: boolean;
    /** 系列年份，如 "2025-26"；目录按它分组 */
    year: string;
    releaseDate?: string;
    note: string;
    boxes: BoxRef[];
}

/** 同一发行商下按年份归好组的系列，年份新的在前 */
export interface YearGroupDef {
    year: string;
    products: ProductDef[];
}
