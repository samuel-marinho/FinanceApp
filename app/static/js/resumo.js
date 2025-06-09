document.addEventListener('DOMContentLoaded', function() {
    const dataInicio = document.getElementById('dataInicio');
    const dataFim = document.getElementById('dataFim');
    const resumoReceitas = document.getElementById('resumoReceitas');
    const resumoDespesas = document.getElementById('resumoDespesas');
    const resumoSaldo = document.getElementById('resumoSaldo');
    const transacoesContainer = document.getElementById('transacoesContainer');
    const graficoCategorias = document.getElementById('graficoCategorias');

    let chartPizza = null;

    function formatarValor(valor) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(valor);
    }

    function agruparPorData(transacoes) {
        const grupos = {};
        transacoes.forEach(t => {
            const data = new Date(t.data);
            const dataStr = data.toLocaleDateString('pt-BR');
            if (!grupos[dataStr]) grupos[dataStr] = [];
            grupos[dataStr].push(t);
        });
        // Ordenar datas decrescente
        return Object.entries(grupos).sort((a, b) => {
            const d1 = a[0].split('/').reverse().join('-');
            const d2 = b[0].split('/').reverse().join('-');
            return d2.localeCompare(d1);
        });
    }

    async function atualizarResumo() {
        // Buscar despesas
        let url = '/api/despesas';
        const params = new URLSearchParams();
        if (dataInicio.value) params.append('data_inicio', dataInicio.value);
        if (dataFim.value) params.append('data_fim', dataFim.value);
        if (params.toString()) url += '?' + params.toString();
        const resp = await fetch(url);
        const despesas = await resp.json();

        // Calcular totais
        let totalDespesas = 0;
        let totalReceitas = 0; // (pode ser implementado no futuro)
        let saldo = 0;
        const categorias = {};
        despesas.forEach(d => {
            totalDespesas += d.valor;
            saldo -= d.valor;
            categorias[d.categoria] = (categorias[d.categoria] || 0) + d.valor;
        });
        resumoDespesas.textContent = formatarValor(totalDespesas);
        resumoReceitas.textContent = formatarValor(totalReceitas);
        resumoSaldo.textContent = formatarValor(saldo);

        // Gráfico de pizza
        const labels = Object.keys(categorias);
        const data = Object.values(categorias);
        if (chartPizza) chartPizza.destroy();
        chartPizza = new Chart(graficoCategorias, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        '#7f53ac', '#647dee', '#fbc2eb', '#a18cd1', '#ffb6b9', '#f9d423', '#00b8a9', '#f67280'
                    ],
                }]
            },
            options: {
                plugins: {
                    legend: { display: true, position: 'bottom' }
                }
            }
        });

        // Agrupar por data e exibir transações
        const grupos = agruparPorData(despesas);
        transacoesContainer.innerHTML = '';
        if (grupos.length === 0) {
            transacoesContainer.innerHTML = '<div class="text-center text-muted">Nenhuma transação encontrada.</div>';
        } else {
            grupos.forEach(([data, transacoes]) => {
                const bloco = document.createElement('div');
                bloco.className = 'mb-3';
                bloco.innerHTML = `<div class="fw-bold text-primary mb-2">${data}</div>`;
                transacoes.forEach(t => {
                    const item = document.createElement('div');
                    item.className = 'd-flex align-items-center justify-content-between rounded p-2 mb-2 shadow-sm bg-white';
                    item.innerHTML = `
                        <div>
                            <div class="fw-semibold">${t.nome}</div>
                            <div class="small text-muted">${t.categoria}</div>
                        </div>
                        <div class="d-flex align-items-center gap-2">
                            <span class="fw-bold text-danger">${formatarValor(t.valor)}</span>
                            <button class="btn btn-sm btn-light btn-editar" data-id="${t.id}" title="Editar"><i class="bi bi-pencil"></i></button>
                            <button class="btn btn-sm btn-light btn-excluir" data-id="${t.id}" title="Excluir"><i class="bi bi-trash"></i></button>
                        </div>
                    `;
                    bloco.appendChild(item);
                });
                transacoesContainer.appendChild(bloco);
            });
        }

        // Eventos editar/excluir
        document.querySelectorAll('.btn-editar').forEach(btn => {
            btn.onclick = function() { abrirModalEditar(this.dataset.id, despesas); };
        });
        document.querySelectorAll('.btn-excluir').forEach(btn => {
            btn.onclick = function() { excluirDespesa(this.dataset.id); };
        });
    }

    async function excluirDespesa(id) {
        if (!confirm('Deseja realmente excluir esta despesa?')) return;
        await fetch(`/api/despesas/${id}`, { method: 'DELETE' });
        atualizarResumo();
    }

    function abrirModalEditar(id, despesas) {
        const despesa = despesas.find(d => d.id === id);
        if (!despesa) return;
        document.getElementById('editId').value = despesa.id;
        document.getElementById('editNome').value = despesa.nome;
        document.getElementById('editCategoria').value = despesa.categoria;
        document.getElementById('editValor').value = despesa.valor;
        const modal = new bootstrap.Modal(document.getElementById('modalEditarDespesa'));
        modal.show();
    }

    document.getElementById('formEditarDespesa').onsubmit = async function(e) {
        e.preventDefault();
        const id = document.getElementById('editId').value;
        const nome = document.getElementById('editNome').value;
        const categoria = document.getElementById('editCategoria').value;
        const valor = parseFloat(document.getElementById('editValor').value);
        await fetch(`/api/despesas/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, categoria, valor })
        });
        bootstrap.Modal.getInstance(document.getElementById('modalEditarDespesa')).hide();
        atualizarResumo();
    };

    dataInicio.addEventListener('change', atualizarResumo);
    dataFim.addEventListener('change', atualizarResumo);

    atualizarResumo();
}); 