<template>
  <div class="app-container">
    <!-- ヘッダー -->
    <header class="header">
      <div class="logo">TMT</div>
      <div class="search-bar">
        <input type="text" placeholder="商品を検索..." />
        <button>検索</button>
      </div>
    </header>

    <!-- メインコンテンツ -->
    <main class="main-content">
      <h2>注目の商品</h2>
      <div class="product-list">
        <div v-for="product in products" :key="product.id" class="product-card">
          <img :src="product.image" alt="商品画像" />
          <h3>{{ product.name }}</h3>
          <p class="price">￥{{ product.price }}</p>
          <button>カートに追加</button>
        </div>
      </div>
    </main>

    <!-- フッター -->
    <footer class="footer">
      &copy; 2025 TMT株式会社. すべての権利を保有します。
    </footer>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

interface Product {
  id: number
  name: string
  price: number
  image: string
}

export default defineComponent({
  name: 'TmtHome',
  data() {
    return {
      products: [
        {
          id: 1,
          name: "ワイヤレスヘッドホン",
          price: 5999,
          image:
            "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=200&q=80",
        },
        {
          id: 2,
          name: "スマートウォッチ",
          price: 19999,
          image:
            "https://images.unsplash.com/photo-1519744792095-2f2205e87b6f?auto=format&fit=crop&w=200&q=80",
        },
        {
          id: 3,
          name: "Bluetoothスピーカー",
          price: 2999,
          image:
            "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?auto=format&fit=crop&w=200&q=80",
        },
        {
          id: 4,
          name: "デジタルカメラ",
          price: 49999,
          image:
            "https://images.unsplash.com/photo-1519183071298-a2962cc1d48c?auto=format&fit=crop&w=200&q=80",
        },
      ] as Product[],
    }
  },
})
</script>

<style scoped>
.app-container {
  font-family: Arial, sans-serif;
  background: #fff;
  color: #111;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* ヘッダー */
.header {
  display: flex;
  align-items: center;
  background-color: #232f3e; /* Amazon風ダークブルー */
  padding: 1rem 2rem;
  color: white;
  gap: 1rem;
}

.logo {
  font-size: 1.8rem;
  font-weight: bold;
  user-select: none;
}

.search-bar {
  flex: 1;
  display: flex;
}

.search-bar input {
  flex: 1;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px 0 0 4px;
  font-size: 1rem;
}

.search-bar button {
  background-color: #febd69; /* Amazon風オレンジ */
  border: none;
  padding: 0 1rem;
  cursor: pointer;
  border-radius: 0 4px 4px 0;
  font-weight: bold;
  transition: background-color 0.3s ease;
}

.search-bar button:hover {
  background-color: #f3a847;
}

/* メインコンテンツ */
.main-content {
  flex: 1;
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.main-content h2 {
  margin-bottom: 1rem;
}

.product-list {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.product-card {
  flex: 1 1 200px;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 1rem;
  text-align: center;
  box-shadow: 0 2px 6px rgb(0 0 0 / 0.1);
  transition: box-shadow 0.3s ease;
  user-select: none;
  background: white;
}

.product-card:hover {
  box-shadow: 0 4px 12px rgb(0 0 0 / 0.2);
}

.product-card img {
  width: 100%;
  max-height: 150px;
  object-fit: contain;
  margin-bottom: 0.75rem;
}

.product-card h3 {
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
}

.price {
  color: #b12704;
  font-weight: bold;
  margin-bottom: 0.75rem;
}

.product-card button {
  background-color: #ffd814;
  border: 1px solid #fcd200;
  padding: 0.5rem 1rem;
  cursor: pointer;
  border-radius: 4px;
  font-weight: bold;
  transition: background-color 0.3s ease;
}

.product-card button:hover {
  background-color: #f7ca00;
}

/* フッター */
.footer {
  text-align: center;
  padding: 1rem;
  background-color: #232f3e;
  color: white;
  font-size: 0.9rem;
  user-select: none;
}
</style>
