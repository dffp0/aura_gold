const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// فحص أن السيرفر شغال
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// OAuth Callback من سلة
app.get("/api/salla/callback", async (req, res) => {
  try {
    const code = req.query.code;

    if (!code) {
      return res.status(400).send("ما وصل code من سلة");
    }

    const params = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: process.env.SALLA_CLIENT_ID,
      client_secret: process.env.SALLA_CLIENT_SECRET,
      redirect_uri: "https://aura-backend-vdqi.onrender.com/api/salla/callback",
      code: code,
    });

    const tokenRes = await fetch("https://accounts.salla.sa/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      console.error("Token error:", tokenData);
      return res.status(400).json(tokenData);
    }

    // للتجربة: نرجّع التوكن عشان تخزّنه يدويًا في Render
    res.json(tokenData);
  } catch (err) {
    console.error(err);
    res.status(500).send("صار خطأ أثناء ربط سلة");
  }
});

// جلب منتجات سلة (يقرأ التوكن من Environment)
app.get("/api/salla/products", async (req, res) => {
  try {
    if (!process.env.SALLA_ACCESS_TOKEN) {
      return res
        .status(401)
        .json({ error: "ما فيه Access Token — أضِفه في Render (SALLA_ACCESS_TOKEN)" });
    }

    const response = await fetch("https://api.salla.dev/admin/v2/products", {
      headers: {
        Authorization: `Bearer ${process.env.SALLA_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "فشل الاتصال بسلة" });
  }
});

// جلب سعر الذهب (Proxy لتجاوز CORS)
app.get("/api/gold-price", async (req, res) => {
  try {
    const response = await fetch("https://www.goldapi.io/api/XAU/SAR", {
      method: "GET",
      headers: {
        "x-access-token": process.env.GOLD_API_KEY,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("خطأ في جلب سعر الذهب:", error);
    res.status(500).json({ error: "فشل جلب سعر الذهب" });
  }
});
// تحديث سعر منتج في سلة
app.put("/api/salla/products/:id", async (req, res) => {
  try {
    if (!process.env.SALLA_ACCESS_TOKEN) {
      return res.status(401).json({ error: "ما فيه Access Token" });
    }

    const productId = req.params.id;
    const response = await fetch(
      `https://api.salla.dev/admin/v2/products/${productId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${process.env.SALLA_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(req.body),
      }
    );

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("خطأ في تحديث المنتج:", error);
    res.status(500).json({ error: "فشل تحديث المنتج في سلة" });
  }
});

// تحديث سعر SKU في سلة
app.put("/api/salla/products/:productId/skus/:skuId", async (req, res) => {
  try {
    if (!process.env.SALLA_ACCESS_TOKEN) {
      return res.status(401).json({ error: "ما فيه Access Token" });
    }

    const { productId, skuId } = req.params;
    const response = await fetch(
      `https://api.salla.dev/admin/v2/products/${productId}/skus/${skuId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${process.env.SALLA_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(req.body),
      }
    );

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("خطأ في تحديث SKU:", error);
    res.status(500).json({ error: "فشل تحديث SKU في سلة" });
  }
});

// تشغيل السيرفر
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
