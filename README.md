# Compose Guide — Jetpack Compose cho người mới bắt đầu

Cẩm nang tiếng Việt về Jetpack Compose, trình bày mỗi chủ đề theo cùng một khuôn: **Định nghĩa · Cách dùng · Ví dụ · Chú ý**. Nội dung bám theo cấu trúc tài liệu chính thức của Android Developers, cập nhật cho Compose BOM `2026.09.00` (Compose 1.12, Material 3 1.4).

Trang web: https://canh77.github.io/Compose-Guide/

## Cấu trúc

```
index.html            Trang hoàn chỉnh (được sinh ra, không sửa tay)
assets/style.css      Giao diện sáng/tối
assets/app.js         Mục lục, tìm kiếm, đánh dấu đã đọc, nút chép code
src/head.html         Phần đầu trang và phần giới thiệu
src/foot.html         Phần cuối trang
src/sections/*.html   Mỗi file là một chủ đề, tên dạng CC-NN-slug.html (CC = số chương)
build.mjs             Ghép các phần thành index.html và kiểm tra lỗi
check-links.mjs       Kiểm tra các liên kết ngoài trong index.html
```

## Sửa hoặc thêm chủ đề

1. Sửa hoặc tạo file trong `src/sections/`, giữ đúng khuôn: thẻ `<section class="topic" id="…" data-title="…">` và bốn khối `block-def`, `block-use`, `block-example`, `block-notes` theo thứ tự.
2. Trong code mẫu, viết `&lt;` thay cho `<` và `&amp;` thay cho `&`.
3. Chạy `node build.mjs` (cần Node.js 18 trở lên). Script báo lỗi nếu thiếu khối, trùng id, liên kết nội bộ hỏng hoặc quên escape ký tự.
4. Tùy chọn: `node check-links.mjs` để kiểm tra liên kết ngoài.
5. Commit cả file nguồn lẫn `index.html`.

## Triển khai

Trang được phục vụ bằng GitHub Pages từ nhánh `main`, thư mục gốc (Settings → Pages → Deploy from a branch → `main` / `root`).

## Ghi chú bản quyền

Nội dung và ví dụ code được viết riêng cho cẩm nang; mỗi chủ đề có liên kết tới trang tài liệu gốc trên developer.android.com. Android và Jetpack Compose là thương hiệu của Google LLC.
