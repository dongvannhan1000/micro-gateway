# Sentry Setup Guide for Micro-Security Gateway

## Quick Answer: Data流向 & Privacy

### Question: Dữ liệu lưu ở đâu?

**Answer:** Tất cả data được lưu trong Sentry account của **người deploy**.

- Nếu bạn deploy → Dữ liệu lưu trong Sentry account của **BẠN**
- Nếu user khác deploy → Dữ liệu lưu trong Sentry account của **HỌ**
- Không có central server thu thập data từ tất cả users

### Đây là gì?

- ✅ **Optional feature**: Sentry là tool error monitoring **TÙY CHỌN**
- ✅ **User-controlled**: Mỗi deployment dùng DSN riêng
- ✅ **Privacy-first**: User tự control data của họ

## Setup cho Deployment của Bạn

### Bước 1: Tạo Sentry Account (miễn phí)

1. Truy cập: https://sentry.io/signup/
2. Sign up (free tier: 5,000 errors/tháng)
3. Create new project → Chọn "Next.js"

### Bước 2: Copy DSN

Trong Sentry dashboard:
1. Settings → Projects → [Your Project] → Client Keys (DSN)
2. Copy DSN (có dạng: `https://xxx@o0.ingest.sentry.io/0`)

### Bước 3: Add Environment Variables

**Local development:**
```bash
# Edit .dev.vars
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@o0.ingest.sentry.io/0
```

**Production (Cloudflare Pages):**
```bash
# Add in Pages Dashboard → Settings → Environment Variables
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@o0.ingest.sentry.io/0
```

### Bước 4: Test

```bash
cd apps/dashboard-ui
npm run build
npm start

# Trigger error và check trong Sentry dashboard
# Xem TEST-SENTRY.md để biết cách test
```

## Cách Dùng đã Setup

### ✅ Đã được cấu hình:

- **Error tracking**: Tự động capture tất cả errors
- **Performance monitoring**: Track page load times, API response times
- **Session replay**: Ghi lại user interactions khi lỗi xảy生
- **Source maps**: Upload tự động để stack trace dễ đọc

### 📁 Files được tạo/modify:

```
apps/dashboard-ui/
├── sentry.client.config.ts      # Browser errors
├── sentry.server.config.ts      # Server-side errors
├── sentry.edge.config.ts        # Edge runtime errors
├── instrumentation.ts           # Next.js 15+ initialization
├── next.config.ts               # Sentry webpack config
└── src/app/error.tsx            # Custom error boundary

.env.example                     # Environment variables template
```

## Không muốn dùng Sentry?

**Không sao cả!** Sentry là **optional feature**.

- Nếu không set `NEXT_PUBLIC_SENTRY_DSN` → Sentry không hoạt động
- App vẫn hoạt động bình thường
- Chỉ là bạn sẽ không có error monitoring

## Privacy & Best Practices

### ✅ KHUYẾN NGHỊ:

1. **Mỗi deployment dùng DSN riêng**
   - Không share DSN với deployments khác
   - Mỗi user/org nên có Sentry account riêng

2. **Filter sensitive data**
   - Đã config để filter authorization headers
   - Mask text trong session replays
   - Không log passwords, tokens

3. **Sampling rates cho production**
   - `tracesSampleRate: 0.1` (10% transactions)
   - `replaysSessionSampleRate: 0.1` (10% sessions)
   - `replaysOnErrorSampleRate: 1.0` (100% error sessions)

### ❌ TRÁNH:

1. **Hardcoding DSN trong code**
   - Luôn dùng environment variables
   - Không commit DSN vào git

2. **100% sampling trong production**
   - Tốn chi phí
   - Tốn bandwidth

3. **Log sensitive data**
   - Không log passwords, API keys
   - Filter PII (Personally Identifiable Information)

## Troubleshooting

### Errors không xuất hiện trong Sentry?

1. **Check DSN**: `console.log(process.env.NEXT_PUBLIC_SENTRY_DSN)`
2. **Check environment**: Events filtered trong development mode
3. **Check browser console**: Look cho Sentry errors
4. **Build production**: `npm run build && npm start` (dev mode không gửi events)

### Quá nhiều events?

1. **Giảm sampling rate**: Lower `tracesSampleRate` trong config files
2. **Add ignoreErrors**: Thêm common non-critical errors
3. **Filter transactions**: Use `beforeSendTransaction` để filter

## Cost

**Sentry Free Tier:**
- 5,000 errors/tháng
- 10,000 transactions/tháng (performance)
- 50 replays/tháng

**Với sampling rates hiện tại:**
- ~500 errors/tháng được capture (10%)
- ~1,000 transactions/tháng được capture (10%)
- Phù hợp cho small-medium deployments

## Learn More

- [Sentry Next.js Documentation](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [SENTRY.md](apps/dashboard-ui/SENTRY.md) - Detailed setup guide
- [TEST-SENTRY.md](apps/dashboard-ui/TEST-SENTRY.md) - Testing guide
