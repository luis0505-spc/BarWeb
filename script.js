document.addEventListener('DOMContentLoaded', () => {
    const { jsPDF } = window.jspdf;
    const productElements = document.querySelectorAll('.product');
    const openBarBtn = document.getElementById('openBar');
    const closeBarBtn = document.getElementById('closeBar');
    const generateReportBtn = document.getElementById('generateReport');
    const notification = document.getElementById('notification');
  
    let isBarOpen = false;
    let currentTable = null;
  
    // Objeto que contiene la cuenta de cada mesa (sin incluir generalTotal en la iteración)
    const bills = {
      table1: { total: 0, products: [] },
      table2: { total: 0, products: [] },
      table3: { total: 0, products: [] },
      table4: { total: 0, products: [] }
    };
  
    // Función para recalcular el total general del bar
    const recalcGeneralTotal = () => {
      let total = 0;
      Object.values(bills).forEach(table => {
        total += table.total;
      });
      return total;
    };
  
    const updateGeneralTotalUI = () => {
      document.getElementById('totalBar').textContent = recalcGeneralTotal().toFixed(2);
    };
  
    // Sistema de notificaciones
    function showNotification(message, type = 'success') {
      notification.textContent = message;
      notification.className = `notification ${type} show`;
      setTimeout(() => notification.classList.remove('show'), 3000);
    }
  
    // Función para agrupar productos
    const groupProducts = (products) => {
      return products.reduce((acc, product) => {
        if (!acc[product.name]) {
          acc[product.name] = { quantity: 0, total: 0 };
        }
        acc[product.name].quantity++;
        acc[product.name].total += product.price;
        return acc;
      }, {});
    };
  
    // Actualizar interfaz de una mesa
    const updateUI = (tableId) => {
      const table = document.getElementById(tableId);
      const groupedProducts = groupProducts(bills[tableId].products);
      const consumedProductsEl = table.querySelector('.consumed-products');
      if (consumedProductsEl) {
        consumedProductsEl.innerHTML = Object.entries(groupedProducts)
          .map(
            ([name, details]) => `
              <div class="product-item">
                <span>${name} x${details.quantity}</span>
                <span>$${details.total.toFixed(2)}</span>
              </div>
            `
          )
          .join('');
      }
      const billTotalEl = table.querySelector('.bill-total');
      if (billTotalEl) {
        billTotalEl.textContent = `Total: $${bills[tableId].total.toFixed(2)}`;
      }
      updateGeneralTotalUI();
    };
  
    // Actualizar contenido del modal para la mesa actual
    const updateModalContent = () => {
      if (!currentTable) return;
      const modalConsumed = document.querySelector('.modal-consumed-products');
      const grouped = groupProducts(bills[currentTable].products);
      modalConsumed.innerHTML = Object.entries(grouped)
        .map(
          ([name, details]) => `
            <div class="modal-product-item" data-name="${name}">
              <span>${name} x${details.quantity}</span>
              <span>
                $${details.total.toFixed(2)}
                <i class="fas fa-trash delete-product" data-name="${name}"></i>
              </span>
            </div>
          `
        )
        .join('');
      document.getElementById('modalTotal').textContent = bills[currentTable].total.toFixed(2);
      document.getElementById('modalTableTitle').textContent = `Mesa ${currentTable.replace('table', '')}`;
    };
  
    // Cargar en el modal el menú de productos (los disponibles en la barra)
    const updateModalProducts = () => {
      const modalProductsContainer = document.querySelector('.modal-products');
      modalProductsContainer.innerHTML = Array.from(productElements)
        .map((productEl) => {
          const name = productEl.dataset.name;
          const price = productEl.dataset.price;
          return `<div class="modal-menu-product" data-name="${name}" data-price="${price}">
                    <i class="${productEl.querySelector('i').className}"></i> ${name} - $${parseFloat(price).toFixed(2)}
                  </div>`;
        })
        .join('');
    };
  
    // Inicializar menú del modal
    updateModalProducts();
  
    // Eventos de arrastrar y soltar en la barra
    productElements.forEach((product) => {
      product.addEventListener('dragstart', (e) => {
        if (!isBarOpen) {
          e.preventDefault();
          showNotification('El bar está cerrado 🚫', 'error');
          return;
        }
        const data = {
          name: product.dataset.name,
          price: parseFloat(product.dataset.price)
        };
        e.dataTransfer.setData('text/plain', JSON.stringify(data));
      });
    });
  
    document.querySelectorAll('.drop-zone').forEach((zone) => {
      zone.addEventListener('dragover', (e) => e.preventDefault());
      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        if (!isBarOpen) return;
        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
        const tableId = e.target.closest('.table').id;
        bills[tableId].products.push(data);
        bills[tableId].total += data.price;
        updateUI(tableId);
        if (currentTable === tableId) updateModalContent();
        showNotification(`${data.name} añadido ✅`);
      });
    });
  
    // Abrir y cerrar el bar
    openBarBtn.addEventListener('click', () => {
      isBarOpen = true;
      showNotification('¡Bar abierto! 🍻', 'success');
    });
  
    closeBarBtn.addEventListener('click', () => {
      isBarOpen = false;
      showNotification('¡Bar cerrado! 🔒', 'warning');
    });
  
    // Botón para limpiar (vaciar) la cuenta de una mesa
    document.querySelectorAll('.btn-clear').forEach((button) => {
      button.addEventListener('click', (e) => {
        const tableId = `table${e.target.dataset.table}`;
        bills[tableId].total = 0;
        bills[tableId].products = [];
        updateUI(tableId);
        if (currentTable === tableId) updateModalContent();
        showNotification(`Mesa ${tableId.replace('table', '')} limpiada 🧹`, 'success');
      });
    });
  
    // Generar factura desde la mesa (botones en cada mesa)
    document.querySelectorAll('.btn-generate').forEach((button) => {
        button.addEventListener('click', (e) => {
          const tableId = `table${e.currentTarget.dataset.table}`;
          generateInvoice(tableId);
        });
      });      
  
    // Función para generar factura PDF para una mesa
    const generateInvoice = (tableId) => {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text(`Factura Mesa ${tableId.replace('table', '')}`, 10, 10);
      doc.setFontSize(12);
      let y = 20;
      const grouped = groupProducts(bills[tableId].products);
      Object.entries(grouped).forEach(([name, details]) => {
        doc.text(`${name} x${details.quantity} - $${details.total.toFixed(2)}`, 10, y);
        y += 10;
      });
      doc.text(`Total: $${bills[tableId].total.toFixed(2)}`, 10, y + 10);
      doc.save(`Factura_${tableId}.pdf`);
    };
  
    // Abrir el modal al hacer clic en una mesa (excepto si se hace clic en algún botón)
    document.querySelectorAll('.table').forEach((table) => {
      table.addEventListener('click', (e) => {
        // Evitar abrir el modal si se hace clic en un botón
        if (e.target.closest('.btn')) return;
        // Validar que el bar esté abierto
        if (!isBarOpen) {
          showNotification('El bar está cerrado 🚫', 'error');
          return;
        }
        openTableModal(table.id);
      });
    });    
  
    const openTableModal = (tableId) => {
      currentTable = tableId;
      const modal = document.getElementById('tableModal');
      modal.style.display = 'block';
      updateModalContent();
    };
  
    // En el modal: al hacer clic en un producto del menú se añade a la mesa actual
    document.querySelector('.modal-products').addEventListener('click', (e) => {
      // Validar que el bar esté abierto
      if (!isBarOpen) {
        showNotification('El bar está cerrado 🚫', 'error');
        return;
      }
      const productEl = e.target.closest('.modal-menu-product');
      if (productEl) {
        const productData = {
          name: productEl.dataset.name,
          price: parseFloat(productEl.dataset.price)
        };
        bills[currentTable].products.push(productData);
        bills[currentTable].total += productData.price;
        updateUI(currentTable);
        updateModalContent();
        showNotification(`${productData.name} añadido ✅`);
      }
    });    
  
    // En el modal: eliminar producto consumido
    document.querySelector('.modal-consumed-products').addEventListener('click', (e) => {
      if (e.target.classList.contains('delete-product')) {
        const productName = e.target.dataset.name;
        const index = bills[currentTable].products.findIndex((p) => p.name === productName);
        if (index > -1) {
          const removed = bills[currentTable].products.splice(index, 1)[0];
          bills[currentTable].total -= removed.price;
          updateUI(currentTable);
          updateModalContent();
          showNotification(`${removed.name} eliminado ❌`, 'warning');
        }
      }
    });
  
    // Generar factura desde el modal
    document.getElementById('modalGenerateBill').addEventListener('click', () => {
      if (currentTable) {
        generateInvoice(currentTable);
      }
    });
  
    // Cerrar el modal
    document.querySelector('.close-modal').addEventListener('click', () => {
      document.getElementById('tableModal').style.display = 'none';
      currentTable = null;
    });
  
    window.addEventListener('click', (e) => {
      const modal = document.getElementById('tableModal');
      if (e.target === modal) {
        modal.style.display = 'none';
        currentTable = null;
      }
    });
  
    // Generar reporte general del bar
    generateReportBtn.addEventListener('click', () => {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text('Reporte General del Bar', 10, 10);
      doc.setFontSize(12);
      let y = 20;
      Object.keys(bills).forEach((tableId) => {
        const grouped = groupProducts(bills[tableId].products);
        doc.text(`Mesa ${tableId.replace('table', '')}:`, 10, y);
        y += 10;
        Object.entries(grouped).forEach(([name, details]) => {
          doc.text(`   ${name} x${details.quantity} - $${details.total.toFixed(2)}`, 10, y);
          y += 10;
        });
        doc.text(`   Total: $${bills[tableId].total.toFixed(2)}`, 10, y);
        y += 10;
      });
      doc.text(`Total del Bar: $${recalcGeneralTotal().toFixed(2)}`, 10, y + 10);
      doc.save('Reporte_General.pdf');
    });
  });
  