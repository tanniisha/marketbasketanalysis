import React, { useState, useEffect, useMemo } from 'react';
import './index.css';

const INITIAL_PRODUCTS = [
  { id: "1", name: "PINK REGENCY TEACUP AND SAUCER", price: 15.99, image: "/images/teacup_pink_1790952060692.jpg" },
  { id: "2", name: "GREEN REGENCY TEACUP AND SAUCER", price: 15.99, image: "/images/teacup_green_1790952073177.jpg" },
  { id: "3", name: "GARDENERS KNEELING PAD KEEP CALM", price: 12.50, image: "/images/kneeling_pad_1790952086740.jpg" },
  { id: "4", name: "WHITE METAL LANTERN", price: 12.99, image: "/images/product_lantern_1790951140981.jpg" },
  { id: "5", name: "HAND WARMER RED POLKA DOT", price: 5.25, image: "/images/hand_warmer_1790951663492.jpg" },
  { id: "6", name: "SET 7 BABUSHKA NESTING BOXES", price: 18.50, image: "/images/product_nesting_boxes_1790951175411.jpg" },
  { id: "7", name: "KNITTED UNION FLAG HOT WATER BOTTLE", price: 14.50, image: "/images/water_bottle_1790951723806.jpg" },
  { id: "8", name: "WHITE HANGING HEART T-LIGHT HOLDER", price: 8.50, image: "/images/heart_holder_1790951682681.jpg" },
  { id: "9", name: "ROSES REGENCY TEACUP AND SAUCER", price: 15.99, image: "/images/teacup_roses_1790953332414.jpg" },
  { id: "10", name: "GARDENERS KNEELING PAD CUP OF TEA", price: 12.50, image: "/images/kneeling_pad_tea_1790953352747.jpg" },
];

function App() {
  const [products, setProducts] = useState(INITIAL_PRODUCTS);
  const [cart, setCart] = useState([]);
  const [status, setStatus] = useState('Initializing API...');
  const [backendReady, setBackendReady] = useState(false);
  const [aiRules, setAiRules] = useState([]);

  useEffect(() => {
    const initializeStore = async () => {
      try {
        setStatus('Loading dataset...');
        // 1. Load dataset
        let res = await fetch('/load_default_dataset', { method: 'POST' });
        if (!res.ok) {
          throw new Error('Failed to load dataset');
        }

        setStatus('Training Recommendation Engine (FP-Growth)...');
        // 2. Run FP-Growth to get rules for recommendations
        res = await fetch('/analyze/fpgrowth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ min_support: 0.02, min_confidence: 0.2, min_lift: 1.0 })
        });
        
        if (!res.ok) throw new Error('Failed to run analysis');
        const data = await res.json();
        
        // Store the rules globally
        if (data.top_10_rules) {
          setAiRules(data.top_10_rules);
          
          // Ensure products mentioned in rules exist in our store
          const newProducts = [...INITIAL_PRODUCTS];
          data.top_10_rules.forEach(rule => {
            const items = [...rule.antecedents, ...rule.consequents];
            items.forEach(item => {
              if (!newProducts.find(p => p.name === item)) {
                newProducts.push({
                  id: Math.random().toString(36).substr(2, 9),
                  name: item,
                  price: 9.99,
                  image: `https://images.unsplash.com/photo-1610996843603-9d9fc9cb2544?auto=format&fit=crop&w=400&q=80&sig=${Math.random()}`
                });
              }
            });
          });
          setProducts(newProducts);
        }
        
        setStatus('Ready');
        setBackendReady(true);
      } catch (err) {
        console.error(err);
        setStatus(`Error: ${err.message}`);
      }
    };

    initializeStore();
  }, []);

  const addToCart = (product) => {
    setCart(prev => [...prev, product]);
  };

  const removeFromCart = (indexToRemove) => {
    setCart(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price, 0).toFixed(2);
  const cartItemNames = cart.map(item => item.name);

  // Dynamic AI Recommendations based on cart contents
  const recommendations = useMemo(() => {
    if (cart.length === 0) return [];
    
    // Find rules where all antecedents are in the cart, 
    // and at least one consequent is NOT in the cart
    const validRules = aiRules.filter(rule => {
      const hasAllAntecedents = rule.antecedents.every(ant => cartItemNames.includes(ant));
      const hasConsequentMissing = rule.consequents.some(con => !cartItemNames.includes(con));
      return hasAllAntecedents && hasConsequentMissing;
    });

    // Sort by lift (strongest correlation first)
    validRules.sort((a, b) => b.lift - a.lift);

    // Extract unique products to recommend
    const recProducts = [];
    validRules.forEach(rule => {
      rule.consequents.forEach(conName => {
        if (!cartItemNames.includes(conName) && !recProducts.find(p => p.product.name === conName)) {
          const productObj = products.find(p => p.name === conName);
          if (productObj) {
            recProducts.push({
              product: productObj,
              rule: rule
            });
          }
        }
      });
    });

    return recProducts.slice(0, 3); // Top 3 recommendations
  }, [cartItemNames, aiRules, products]);

  return (
    <div className="app-container">
      <nav className="navbar">
        <div className="brand">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
          SmartBasket
        </div>
        <div className="cart-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
          Cart <span className="cart-badge">{cart.length}</span>
        </div>
      </nav>

      <section className="hero">
        <h1>Welcome to the Future of Shopping</h1>
        <p>Experience real-time AI cross-selling powered by FP-Growth Association Rule Mining.</p>
        <div className="status-bar">
          <div className={`indicator ${backendReady ? 'active' : 'loading'}`}></div>
          {status}
        </div>
      </section>

      <main className="app-layout">
        <div className="products-grid">
          {products.map(product => (
            <div key={product.id} className="product-card">
              <img src={product.image} alt={product.name} className="product-image" />
              <div className="product-info">
                <h3 className="product-name">{product.name}</h3>
                <div className="product-price">${product.price.toFixed(2)}</div>
                <button className="btn btn-add" onClick={() => addToCart(product)}>
                  Add to Cart
                </button>
              </div>
            </div>
          ))}
        </div>

        <aside className="sidebar">
          <div className="panel cart-panel">
            <h2 className="panel-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line></svg>
              Your Cart
            </h2>
            
            {cart.length === 0 ? (
              <div className="empty-state">Your cart is empty.</div>
            ) : (
              <>
                <div className="cart-list">
                  {cart.map((item, index) => (
                    <div key={index} className="cart-item">
                      <div className="cart-item-info">
                        <span className="cart-item-name">{item.name}</span>
                        <span className="cart-item-price">${item.price.toFixed(2)}</span>
                      </div>
                      <button className="remove-btn" onClick={() => removeFromCart(index)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                      </button>
                    </div>
                  ))}
                </div>
                <div className="cart-total">
                  <span>Total:</span>
                  <span>${cartTotal}</span>
                </div>
              </>
            )}
          </div>

          <div className="panel recs-panel">
            <h2 className="panel-title">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
              Smart Recommendations
              <span className="ai-badge">Smart Rules</span>
            </h2>
            
            {cart.length === 0 ? (
              <div className="empty-state">Add items to cart to see recommendations.</div>
            ) : recommendations.length === 0 ? (
              <div className="empty-state">No strong associations found for current cart.</div>
            ) : (
              <div className="recs-list">
                {recommendations.map((rec, idx) => (
                  <div key={idx} className="rec-card">
                    <h4 className="rec-title">Freq. Bought Together</h4>
                    <p className="rec-reason">
                      Because you added <strong>{rec.rule.antecedents[0]}</strong>, you might like this:
                    </p>
                    <div className="rec-actions">
                      <span className="rec-item-name" title={rec.product.name}>{rec.product.name}</span>
                      <button className="btn btn-rec" onClick={() => addToCart(rec.product)}>
                        + Add (${rec.product.price.toFixed(2)})
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}

export default App;
