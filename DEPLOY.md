# Render 배포 가이드

## 1. 사전 준비

### GitHub 저장소 생성
```bash
cd c:/Users/IdeaPad/RPG/server
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/godsaeng-rpg-server.git
git push -u origin main
```

## 2. Render 배포

### 방법 A: render.yaml 사용 (Blueprint)

1. [Render 대시보드](https://dashboard.render.com) 접속
2. "New" > "Blueprint" 클릭
3. GitHub 저장소 연결
4. `render.yaml` 파일이 자동 감지됨
5. "Apply" 클릭하면 DB + 서버가 함께 생성됨

### 방법 B: 수동 생성

#### 2-1. PostgreSQL 데이터베이스 생성
1. Render 대시보드 > "New" > "PostgreSQL"
2. 설정:
   - Name: `godsaeng-db`
   - Database: `godsaeng_rpg`
   - User: `godsaeng`
   - Region: `Singapore`
   - Plan: `Free`
3. "Create Database" 클릭
4. 생성 후 "Internal Database URL" 복사 (나중에 사용)

#### 2-2. Web Service 생성
1. Render 대시보드 > "New" > "Web Service"
2. GitHub 저장소 연결
3. 설정:
   - Name: `godsaeng-rpg-api`
   - Region: `Singapore`
   - Branch: `main`
   - Root Directory: (비워두기, 또는 `server` if monorepo)
   - Runtime: `Node`
   - Build Command: `npm install && npx prisma generate && npm run build`
   - Start Command: `npm run start`
   - Plan: `Free`

4. Environment Variables 추가:
   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `DATABASE_URL` | (위에서 복사한 Internal Database URL) |
   | `JWT_SECRET` | (Generate 버튼 클릭 또는 랜덤 문자열) |
   | `JWT_EXPIRES_IN` | `7d` |

5. "Create Web Service" 클릭

## 3. 배포 후 확인

### Health Check
```bash
curl https://godsaeng-rpg-api.onrender.com/health
```

응답 예시:
```json
{"status":"ok","timestamp":"2024-12-29T07:00:00.000Z"}
```

### 데이터베이스 마이그레이션
Render Shell 또는 로컬에서:
```bash
# 로컬에서 실행 (DATABASE_URL을 External URL로 설정)
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

## 4. 프론트엔드 API URL 변경

배포 완료 후 Render에서 제공하는 URL을 프론트엔드에 적용:

### `frontend/src/services/api.ts` 수정
```typescript
// 개발 환경
// const API_BASE_URL = 'http://192.168.0.125:3000';

// 프로덕션 환경 (Render 배포 후)
const API_BASE_URL = 'https://godsaeng-rpg-api.onrender.com';
```

### APK 재빌드
```bash
cd frontend/android
./gradlew assembleRelease
```

## 5. 무료 플랜 주의사항

### Render Free Tier 제한
- **15분 무활동 시 슬립**: 요청이 없으면 서버가 슬립 상태로 전환
- **첫 요청 시 ~30초 대기**: 슬립 해제에 시간 소요
- **월 750시간**: 한 달 내내 운영 가능 (750 > 720시간)
- **PostgreSQL 90일**: 무료 DB는 90일 후 삭제 (유료 전환 필요)

### 슬립 방지 팁 (선택사항)
1. [UptimeRobot](https://uptimerobot.com) 무료 계정으로 5분마다 health check ping
2. 또는 cron-job.org 사용

## 6. 트러블슈팅

### 빌드 실패
```
Error: Cannot find module 'prisma'
```
→ `package.json`에 prisma가 devDependencies에 있는지 확인

### DB 연결 실패
```
Error: connect ECONNREFUSED
```
→ DATABASE_URL이 "Internal Database URL"인지 확인 (External 아님)

### Prisma 에러
```
Error: Prisma Client is not generated
```
→ Build command에 `npx prisma generate` 포함 확인

## 7. 유용한 명령어

```bash
# Render CLI 설치 (선택사항)
npm install -g render-cli

# 로그 확인
render logs godsaeng-rpg-api

# 재배포
render deploy godsaeng-rpg-api
```

## 8. 비용 (참고)

| 항목 | Free | Starter |
|------|------|---------|
| Web Service | $0 (슬립 있음) | $7/월 |
| PostgreSQL | 90일 무료 | $7/월 |
| 총 비용 | $0 | $14/월 |

---

배포 완료 후 앱의 API URL을 Render URL로 변경하고 APK를 다시 빌드하세요!
