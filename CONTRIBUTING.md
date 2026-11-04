# 贡献指南

感谢参与 hohu-admin-web。

## 贡献许可与 DCO

自 v0.1.5 起，新贡献默认按 [Apache License 2.0](./LICENSE) 授权，贡献者保留版权。v0.1.4 及此前的版本曾以 MIT 发布，该授权对已分发副本继续有效，见 [NOTICE](./NOTICE)。

SoybeanAdmin 继承代码的 MIT 许可与版权声明必须保留，详见 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)。引入其他第三方代码时也须保留适用的声明。DCO 不代表版权转让或上游作者的额外专利授权。

提交规则统一见 [主贡献指南](https://github.com/aihohu/hohu-admin/blob/main/docs/CONTRIBUTING.md#提交规范与授权)。使用一句英文 `type(scope): description`；维护者自己的贡献默认不添加 `Signed-off-by`、`Co-Authored-By` 或版权尾注，外部贡献仍使用 `git commit -s`。逐文件暂存，不跳过钩子，不 amend 已推送提交；提交、推送须有明确授权。

## 稳定系列发布维护

独立 0.1 热修复使用默认分支的 `Release` 控制工具，选择 `mode=release`、`channel=stable-0.1`，固定本仓与 Backend 的同号受保护补丁 SHA。`Verify stable release channel` 提供无发布写入的完整 CI 与 OCI 候选演练；候选不是正式发布证据。输入、环境保护、首次构建与同运行恢复规则统一见[发布维护](https://github.com/aihohu/hohu-admin/blob/main/docs/RELEASE.md#独立-01-热修复通道)，两仓默认分支集成并完成演练前不能宣称通道已启用。

## 许可文件维护

根目录的 `LICENSE`、`NOTICE` 和 `THIRD_PARTY_NOTICES.md` 是许可说明来源。修改时同步 `public/licenses/` 中的对应发布副本，保持内容一致；Vite 会将这些文件复制到 `dist/licenses/`，发布构建产物时须保留该目录。
