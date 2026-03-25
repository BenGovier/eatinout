# Production Memory & CPU Optimization Report

**Target:** Azure App Service (Premium v3 P0V3 – 4GB RAM)  
**Symptoms:** CPU spikes 5–7 min, memory ~1.4GB+, app unreachable, process recycle

---

## 1. Critical Issues Fixed

### 1.1 `/api/restaurants/all` – Loading all restaurants into memory

**Problem:** `Restaurant.find(query)` with no `.limit()` loaded all matching restaurants (400+), then all offers for them, into memory before pagination.

**Impact:** ~400 restaurants × (doc size + 15 offers) ≈ 50–100MB+ per request. Under load this easily exceeded 1.4GB.

**Fix:** Added `limit(500)` to cap in-memory load.

**File:** `app/api/restaurants/all/route.ts` (lines 75–82)

---

### 1.2 `/api/categories` – Returning full restaurant documents

**Problem:** Aggregation returned full `restaurants` array with offers for each category. Frontend only needed `restaurantCount`, `offersCount`, `isGlobal`.

**Impact:** Large response payload, heavy aggregation work, and extra memory.

**Fix:** Adjusted aggregation to compute `isGlobal` server-side and to `$project` only `_id`, `name`, `priority`, `restaurantCount`, `offersCount`, `isGlobal` (no restaurants).

**File:** `app/api/categories/route.ts`

---

### 1.3 `/api/favorites` – N+1 query

**Problem:** For each favorite restaurant, a separate `Offer.find()` was executed (e.g. 50 favorites → 51 queries).

**Fix:** One `Offer.find({ restaurantId: { $in: restaurantIds } })`, then grouped by restaurant in memory.

**File:** `app/api/favorites/route.ts`

---

### 1.4 `/api/admin/categories` – Large dropdown limit

**Problem:** `limit: 10000` for dropdown could load many categories.

**Fix:** Replaced with `limit: 500`.

**File:** `app/api/admin/categories/route.ts` (line 51)

---

### 1.5 `/api/areas` – Missing `.lean()`

**Problem:** Mongoose documents were returned instead of plain objects.

**Fix:** Added `.select()` and `.lean()` for lean, smaller results.

**File:** `app/api/areas/route.ts`

---

### 1.6 `/api/restaurants/[id]` – Load all restaurants for slug lookup (CRITICAL)

**Problem:** When `id` is a slug (e.g. `chicken-shop-abc123`), the code ran `Restaurant.find({})` loading ALL restaurants into memory to match by slug. This is hit on every restaurant detail page view.

**Impact:** ~400+ full Mongoose documents loaded per request. Under traffic this caused severe memory spikes.

**Fix:**
- Use `.select("_id name").limit(1000).lean()` to load only minimal fields
- Batch Category/Area lookups with `find({ _id: { $in: ids } })` instead of N×`findById`
- Replace N×`Offer.findByIdAndUpdate` with single `Offer.bulkWrite` for status updates
- Use `.lean()` on offer query

**File:** `app/api/restaurants/[id]/route.ts`

---

### 1.7 `/api/admin/carousels/restaurants` – Unbounded query

**Problem:** `Restaurant.find({ status, hidden })` with no limit.

**Fix:** Added `.limit(1000).lean()`.

**File:** `app/api/admin/carousels/restaurants/route.ts`

---

### 1.8 `/api/restaurants/all` – N update round trips

**Problem:** `Promise.all(offersToUpdate.map(f => Offer.findByIdAndUpdate(...)))` – many parallel DB updates.

**Fix:** Single `Offer.bulkWrite(bulkOps)`.

**File:** `app/api/restaurants/all/route.ts`

---

## 2. APIs Used by Welcome & Restaurants Pages

| API | Purpose | Status |
|-----|---------|--------|
| `/api/restaurants/all` | Main restaurant list (paginated) | Optimized with `limit(500)` |
| `/api/areas` | Location dropdown | Optimized with `.lean()` |
| `/api/admin/categories?dropdown=true` | Cuisines for FlavourSection | Limit 500 |
| `/api/categories` | Categories with counts | Response size reduced |
| `/api/carousels` | Carousel sections | Uses limit, paginated |
| `/api/favorites` | User favorites | N+1 removed |

---

## 3. Patterns Checked

- **force-dynamic:** Only in `app/api/admin/vouchers/bulk/route.ts` – expected.
- **revalidate:** Used in fetch options on client; does not apply to client-side fetches.
- **cache: 'no-store':** Only in `app/(app)/favorites/page.tsx` for favorites – acceptable.
- **MongoDB connection:** Reused via `globalThis.mongoose`; no connection leaks found.

---

## 4. Recommendations

### 4.1 Carousels API

Carousels does `Offer.find` per restaurant inside a `map`. With many carousels/restaurants this can be heavy. Consider:

- Batching offers: `Offer.find({ restaurantId: { $in: allRestaurantIds } })` then grouping.
- Caching carousel responses (e.g. 1–2 minutes).

### 4.2 Database indexes

```javascript
// Restaurant
db.restaurants.createIndex({ status: 1, hidden: 1, createdAt: -1 })
db.restaurants.createIndex({ area: 1, status: 1 })
db.restaurants.createIndex({ category: 1, status: 1 })

// Offer
db.offers.createIndex({ restaurantId: 1, status: 1 })
db.offers.createIndex({ deactivated: 1, tags: 1 })

// Category
db.categories.createIndex({ isActive: 1, name: 1 })
```

### 4.3 Metadata fetch on welcome/restaurants

Areas, cuisines, and categories are loaded together on mount. You could:

- Add SWR or React Query with longer `staleTime` for metadata.
- Lazy-load categories when the category section scrolls into view (optional).

### 4.4 Monitoring

- Log memory before/after heavy endpoints.
- Add APM (Application Insights, Datadog, etc.) to track memory and CPU.
- Use Azure’s diagnostics for process recycle events.

---

## 5. Expected Impact

- Memory per `/api/restaurants/all` reduced by ~60–80% via `limit(500)`.
- Categories response size reduced by ~80%+ by dropping restaurant documents.
- Favorites: ~50 queries → 2 queries.
- Areas: smaller documents and less overhead from `.lean()`.

These changes should improve stability on 4GB instances and reduce process recycling under load.
