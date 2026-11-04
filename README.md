# Video-Creator

Веб-приложение для подготовки и создания motion-design видео по текстовому описанию.

## Структура

```
.github/workflows/deploy.yml  — автоматическая публикация на GitHub Pages
src/
  components/Preview.tsx     — предпросмотр и таймлайн сцен
  lib/storyboard.ts          — логика создания черновой раскадровки
  App.tsx                    — главный экран приложения
  main.tsx                   — точка входа
  styles.css                 — адаптивные стили
  types.ts                   — общие типы проекта
index.html                   — HTML-шаблон
vite.config.ts               — конфигурация Vite и путь GitHub Pages
```

## Запуск разработки

Требуется Node.js 20 или новее.

```bash
npm install
npm run dev
```

Проверка production-сборки:

```bash
npm run build
npm run preview
```

## Публикация

GitHub Actions собирает проект и публикует папку `dist` на GitHub Pages при каждом push в ветку `main`.

В настройках репозитория откройте **Settings → Pages** и выберите **GitHub Actions** в разделе Build and deployment.

## Текущий этап

Версия 0.1.0 — интерфейс, параметры ролика, демонстрационная раскадровка и экспорт структуры проекта в JSON. AI-генерация и экспорт настоящего MP4 ещё не подключены.
