# CosmeMilton UI para Angular

Biblioteca de componentes standalone para Angular, distribuída no formato Angular Package Format. Reaproveita os tokens, fontes e a skin Aurora Ops da biblioteca CosmeMilton UI 4.3.1 e implementa as interações em Angular.

```sh
npm ci
npm run build
npm pack ./dist
```

Importe `@cosmemilton/ui-angular/styles.css` e `@cosmemilton/ui-angular/angular.css` uma vez. Importe os componentes standalone usados em cada tela. `CmThemeService` configura o tema da página e `CM_THEME_STORAGE` e `CM_THEME_SKIN` permitem compartilhar a preferência pelo armazenamento do navegador. Use `CmToastViewport` no shell e `CmToastService` para avisos flutuantes.

A API inclui `CmAuthLayout`, `CmAuthField`, `CmButton`, `CmIcon`, `CmThemeMenu`, `CmToastViewport`, `CmSidebar` e `CmDataTable`. `CmAuthActions` e `CmAuthFooter` marcam os slots do layout de autenticação. A aplicação define as rotas, validação e persistência de contas.

`CmNativeInput`, `CmNativeSelect` e `CmTextarea` aceitam `[(value)]`. `CmCheckbox` e `CmSwitch` aceitam `[(checked)]`. Os cinco controles aceitam Reactive Forms e `ngModel`. Informe `name` para incluir um controle na leitura nativa com `FormData` e `label` para associar o rótulo ao controle. Use `CmForm` no elemento `<form cmForm>` e `CmFormBody` para aplicar o espaçamento a um grupo de campos.

Use `CmTabs` com `cmTabsList`, `cmTabsTrigger` e `cmTabsContent`. O valor identifica tanto o botão quanto o painel. A navegação aceita setas, Home e End e oferece ativação manual ou automática. `CmDisclosure` usa a expansão nativa de `<details>` com `[(open)]`. `CmAccordion` coordena uma lista desses painéis.

`CmDialog` e `CmDrawer` usam `<dialog>` para conter o foco e devolvê-lo ao acionador. A abertura aceita `[(open)]`. Use `cmDialogFooter` para as ações e `(closed)` para reagir ao fechamento.
