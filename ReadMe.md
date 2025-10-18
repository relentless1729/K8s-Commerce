# Build a Kubernetes Microservices Application
## Complete Step-by-Step Guide

---

## 📋 Prerequisites

**Install these tools:**
- Docker Desktop (includes Kubernetes)
- Node.js (v16 or higher)
- kubectl CLI tool
- A code editor (VS Code recommended)

**Enable Kubernetes in Docker Desktop:**
1. Open Docker Desktop
2. Go to Settings → Kubernetes
3. Check "Enable Kubernetes"
4. Click "Apply & Restart"

---

## 🗂️ Project Structure

Create this folder structure:

```
k8s-microservices/
├── product-service/
│   ├── index.js
│   ├── package.json
│   └── Dockerfile
├── order-service/
│   ├── index.js
│   ├── package.json
│   └── Dockerfile
├── api-gateway/
│   ├── index.js
│   ├── package.json
│   └── Dockerfile
└── k8s/
    ├── product-deployment.yaml
    ├── product-service.yaml
    ├── order-deployment.yaml
    ├── order-service.yaml
    ├── gateway-deployment.yaml
    └── gateway-service.yaml
```

---

## 🛍️ Step 1: Build Product Service

### product-service/package.json
```json
{
  "name": "product-service",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "express": "^4.18.0"
  }
}
```

### product-service/index.js
```javascript
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// Sample product data
const products = [
  { id: 1, name: 'Laptop', price: 999.99, stock: 50 },
  { id: 2, name: 'Mouse', price: 29.99, stock: 100 },
  { id: 3, name: 'Keyboard', price: 79.99, stock: 75 },
  { id: 4, name: 'Monitor', price: 299.99, stock: 30 }
];

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'product-service' });
});

// Get all products
app.get('/products', (req, res) => {
  res.json({ products });
});

// Get product by ID
app.get('/products/:id', (req, res) => {
  const product = products.find(p => p.id === parseInt(req.params.id));
  if (product) {
    res.json({ product });
  } else {
    res.status(404).json({ error: 'Product not found' });
  }
});

app.listen(PORT, () => {
  console.log(`Product Service running on port ${PORT}`);
});
```

### product-service/Dockerfile
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

---

## 📦 Step 2: Build Order Service

### order-service/package.json
```json
{
  "name": "order-service",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "express": "^4.18.0",
    "axios": "^1.4.0"
  }
}
```

### order-service/index.js
```javascript
const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json());

// In-memory order storage
let orders = [];
let orderIdCounter = 1;

// Product service URL (will be Kubernetes service name)
const PRODUCT_SERVICE = process.env.PRODUCT_SERVICE_URL || 'http://product-service:3001';

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'order-service' });
});

// Get all orders
app.get('/orders', (req, res) => {
  res.json({ orders });
});

// Create new order
app.post('/orders', async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    
    // Verify product exists by calling Product Service
    const productResponse = await axios.get(`${PRODUCT_SERVICE}/products/${productId}`);
    const product = productResponse.data.product;
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // Create order
    const order = {
      id: orderIdCounter++,
      productId,
      productName: product.name,
      quantity,
      totalPrice: product.price * quantity,
      status: 'pending',
      createdAt: new Date()
    };
    
    orders.push(order);
    res.status(201).json({ order });
  } catch (error) {
    console.error('Error creating order:', error.message);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// Get order by ID
app.get('/orders/:id', (req, res) => {
  const order = orders.find(o => o.id === parseInt(req.params.id));
  if (order) {
    res.json({ order });
  } else {
    res.status(404).json({ error: 'Order not found' });
  }
});

app.listen(PORT, () => {
  console.log(`Order Service running on port ${PORT}`);
});
```

### order-service/Dockerfile
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
EXPOSE 3002
CMD ["npm", "start"]
```

---

## 🚀 Step 3: Build API Gateway

### api-gateway/package.json
```json
{
  "name": "api-gateway",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "express": "^4.18.0",
    "axios": "^1.4.0"
  }
}
```

### api-gateway/index.js
```javascript
const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Service URLs (Kubernetes service names)
const PRODUCT_SERVICE = process.env.PRODUCT_SERVICE_URL || 'http://product-service:3001';
const ORDER_SERVICE = process.env.ORDER_SERVICE_URL || 'http://order-service:3002';

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'api-gateway' });
});

// Welcome endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to Microservices API Gateway',
    endpoints: {
      products: '/api/products',
      orders: '/api/orders'
    }
  });
});

// Product endpoints
app.get('/api/products', async (req, res) => {
  try {
    const response = await axios.get(`${PRODUCT_SERVICE}/products`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const response = await axios.get(`${PRODUCT_SERVICE}/products/${req.params.id}`);
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ 
      error: error.response?.data?.error || 'Failed to fetch product' 
    });
  }
});

// Order endpoints
app.get('/api/orders', async (req, res) => {
  try {
    const response = await axios.get(`${ORDER_SERVICE}/orders`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const response = await axios.post(`${ORDER_SERVICE}/orders`, req.body);
    res.status(201).json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ 
      error: error.response?.data?.error || 'Failed to create order' 
    });
  }
});

app.get('/api/orders/:id', async (req, res) => {
  try {
    const response = await axios.get(`${ORDER_SERVICE}/orders/${req.params.id}`);
    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({ 
      error: error.response?.data?.error || 'Failed to fetch order' 
    });
  }
});

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
});
```

### api-gateway/Dockerfile
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

---

## 🐳 Step 4: Build Docker Images

Run these commands from the project root:

```bash
# Build Product Service
cd product-service
npm install
docker build -t product-service:1.0 .
cd ..

# Build Order Service
cd order-service
npm install
docker build -t order-service:1.0 .
cd ..

# Build API Gateway
cd api-gateway
npm install
docker build -t api-gateway:1.0 .
cd ..
```

**Verify images:**
```bash
docker images
```

---

## ☸️ Step 5: Create Kubernetes Manifests

### k8s/product-deployment.yaml
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: product-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: product-service
  template:
    metadata:
      labels:
        app: product-service
    spec:
      containers:
      - name: product-service
        image: product-service:1.0
        imagePullPolicy: Never
        ports:
        - containerPort: 3001
        env:
        - name: PORT
          value: "3001"
```

### k8s/product-service.yaml
```yaml
apiVersion: v1
kind: Service
metadata:
  name: product-service
spec:
  selector:
    app: product-service
  ports:
  - port: 3001
    targetPort: 3001
  type: ClusterIP
```

### k8s/order-deployment.yaml
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
spec:
  replicas: 2
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
    spec:
      containers:
      - name: order-service
        image: order-service:1.0
        imagePullPolicy: Never
        ports:
        - containerPort: 3002
        env:
        - name: PORT
          value: "3002"
        - name: PRODUCT_SERVICE_URL
          value: "http://product-service:3001"
```

### k8s/order-service.yaml
```yaml
apiVersion: v1
kind: Service
metadata:
  name: order-service
spec:
  selector:
    app: order-service
  ports:
  - port: 3002
    targetPort: 3002
  type: ClusterIP
```

### k8s/gateway-deployment.yaml
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
spec:
  replicas: 2
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      containers:
      - name: api-gateway
        image: api-gateway:1.0
        imagePullPolicy: Never
        ports:
        - containerPort: 3000
        env:
        - name: PORT
          value: "3000"
        - name: PRODUCT_SERVICE_URL
          value: "http://product-service:3001"
        - name: ORDER_SERVICE_URL
          value: "http://order-service:3002"
```

### k8s/gateway-service.yaml
```yaml
apiVersion: v1
kind: Service
metadata:
  name: api-gateway
spec:
  selector:
    app: api-gateway
  ports:
  - port: 3000
    targetPort: 3000
  type: LoadBalancer
```

---

## 🚀 Step 6: Deploy to Kubernetes

```bash
# Apply all manifests
kubectl apply -f k8s/

# Check deployments
kubectl get deployments

# Check pods
kubectl get pods

# Check services
kubectl get services

# Watch pods status (wait until all are Running)
kubectl get pods -w
```

---

## ✅ Step 7: Test Your Application

**Get the API Gateway URL:**
```bash
kubectl get service api-gateway
```

Look for `EXTERNAL-IP` (on Docker Desktop, it's usually `localhost`)

**Test endpoints:**

```bash
# Test health
curl http://localhost:3000/health

# Get all products
curl http://localhost:3000/api/products

# Get specific product
curl http://localhost:3000/api/products/1

# Create an order
curl -X POST http://localhost:3000/api/orders \
  -H "Content-Type: application/json" \
  -d '{"productId": 1, "quantity": 2}'

# Get all orders
curl http://localhost:3000/api/orders
```

---

## 🔍 Useful Kubernetes Commands

```bash
# View pod logs
kubectl logs <pod-name>

# View logs for all pods of a service
kubectl logs -l app=product-service

# Describe a pod (troubleshooting)
kubectl describe pod <pod-name>

# Get into a pod shell
kubectl exec -it <pod-name> -- sh

# Scale a deployment
kubectl scale deployment product-service --replicas=3

# Delete all resources
kubectl delete -f k8s/

# Port forward to a specific pod
kubectl port-forward <pod-name> 3000:3000
```

---

## 📊 Understanding What You Built

**Architecture:**
- **3 Microservices**: Each handles specific responsibilities
- **Kubernetes Pods**: Each service runs in isolated containers
- **Kubernetes Services**: Enable service-to-service communication
- **Load Balancing**: Traffic is distributed across pod replicas
- **Service Discovery**: Services find each other by name

**Key Concepts Learned:**
- Container orchestration with Kubernetes
- Microservices communication patterns
- Service mesh basics
- Declarative deployment with YAML
- Scaling and load balancing

---

## 🎯 Next Steps

1. **Add a database** (MongoDB or PostgreSQL)
2. **Implement ConfigMaps and Secrets** for configuration
3. **Add health checks and readiness probes**
4. **Set up Ingress** for better routing
5. **Implement monitoring** with Prometheus/Grafana
6. **Add CI/CD pipeline** with GitHub Actions

---

## 🐛 Troubleshooting

**Pods not starting:**
```bash
kubectl describe pod <pod-name>
kubectl logs <pod-name>
```

**ImagePullBackOff error:**
- Make sure `imagePullPolicy: Never` is set
- Verify Docker images exist locally

**Service not accessible:**
```bash
kubectl get endpoints
kubectl port-forward service/api-gateway 3000:3000
```

---

## 🎉 Congratulations!

You've built a production-ready microservices application on Kubernetes! This project demonstrates core DevOps skills that companies are looking for.

**Add to your portfolio:**
- Push code to GitHub
- Add a detailed README
- Include architecture diagrams
- Document what you learned