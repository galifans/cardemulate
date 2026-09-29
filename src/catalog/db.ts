/**
 * 目录 -> D1 镜像负载。
 *
 * 站点目录的「唯一真相」是 TypeScript（src/catalog + src/data/sets），
 * 运行时不查数据库就能渲染全部页面。D1 里的维度表只是这份目录的镜像，
 * 目的有两个：
 *   1. 让 SQL 能做跨维度对账（哪些品类/发行商贡献了多少拆盒量）；
 *   2. 将来接入后台或第三方分析时不必依赖前端包。
 *
 * 镜像通过 POST /api/catalog/sync 手工推送，不参与前端渲染，
 * 所以数据库挂了也不会影响拆卡体验。
 */
import type { CatalogPayload } from "../api/client";
import { CURRENT_APP } from "./apps";
import { CATEGORIES, allBoxes, findMakers, findProducts } from "./index";

export const buildCatalogPayload = (): CatalogPayload => {
    const categories: CatalogPayload["categories"] = [];
    const makers: CatalogPayload["makers"] = [];
    const products: CatalogPayload["products"] = [];

    for (const category of CATEGORIES) {
        categories.push({
            key: category.key,
            name: category.name,
            nameEn: category.nameEn,
            icon: category.icon,
            tagline: category.tagline,
            order: category.order,
            live: category.live,
        });

        for (const maker of findMakers(category.key)) {
            makers.push({
                categoryKey: category.key,
                key: maker.key,
                name: maker.name,
                nameEn: maker.nameEn,
                order: maker.order,
                live: maker.live,
            });

            for (const product of findProducts(category.key, maker.key)) {
                products.push({
                    key: product.key,
                    categoryKey: product.category,
                    makerKey: product.maker,
                    name: product.name,
                    releaseDate: product.releaseDate ?? null,
                    order: product.order,
                    live: product.live,
                    note: product.note,
                });
            }
        }
    }

    const boxes: CatalogPayload["boxes"] = [];
    const subsets: CatalogPayload["subsets"] = [];
    const variants: CatalogPayload["variants"] = [];

    allBoxes().forEach((box, boxIndex) => {
        boxes.push({
            key: box.key,
            productKey: box.productKey,
            categoryKey: box.category,
            makerKey: box.maker,
            slug: box.slug,
            name: box.name,
            cardsPerPack: box.cardsPerPack,
            packsPerBox: box.packsPerBox,
            boxesPerCase: box.boxesPerCase,
            autoGuaranteed: box.autoGuaranteed,
            live: box.live,
            order: boxIndex + 1,
        });

        box.subsets.forEach((subset, subsetIndex) => {
            subsets.push({
                boxKey: box.key,
                key: subset.key,
                name: subset.name,
                code: subset.code ?? null,
                kind: subset.kind,
                detailed: subset.detailed,
                inBox: subset.inBox,
                order: subsetIndex + 1,
                subjectCount: subset.subjects.length,
            });
        });

        for (const variant of box.variants) {
            variants.push({
                boxKey: box.key,
                key: variant.key,
                subsetKey: variant.subset,
                name: variant.variantName,
                fullName: variant.fullName,
                groupKind: variant.group,
                tier: variant.tier,
                odds: variant.odds,
                numbered: variant.numbered,
                weight: variant.weight,
            });
        }
    });

    return {
        app: {
            key: CURRENT_APP.key,
            name: CURRENT_APP.name,
            host: CURRENT_APP.host,
            description: CURRENT_APP.description,
        },
        categories,
        makers,
        products,
        boxes,
        subsets,
        variants,
    };
};
