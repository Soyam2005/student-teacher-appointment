// Global Loader Utility
class GlobalLoader {
  constructor() {
    this.createLoader();
  }

  createLoader() {
    const loader = document.createElement("div");
    loader.id = "globalLoader";
    loader.innerHTML = `
      <div class="loader-overlay">
        <div class="loader-content">
          <div class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          <div class="loader-text mt-2">Loading...</div>
        </div>
      </div>
    `;

    // Add styles
    const style = document.createElement("style");
    style.textContent = `
      #globalLoader {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 1040;
        display: none;
      }
      
      .loader-overlay {
        background-color: rgba(0, 0, 0, 0.5);
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
      }
      
      .loader-content {
        background: white;
        padding: 2rem;
        border-radius: 10px;
        text-align: center;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      }
      
      .loader-text {
        color: #6c757d;
        font-weight: 500;
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(loader);
  }

  show(message = "Loading...") {
    const loader = document.getElementById("globalLoader");
    const text = loader.querySelector(".loader-text");
    text.textContent = message;
    loader.style.display = "block";
  }

  hide() {
    const loader = document.getElementById("globalLoader");
    loader.style.display = "none";
  }
}

// Create global instance
const globalLoader = new GlobalLoader();

export { globalLoader };
