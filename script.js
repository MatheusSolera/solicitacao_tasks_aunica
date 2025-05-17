const API_URL = 'https://prod-30.brazilsouth.logic.azure.com:443/workflows/e57b8efd7a6b472aae5371054b261c7b/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=Zw2AXHRvfhgFshDYj_9el5SdXs8oSi8NeiPqvY4hte8';
const API_URL_PROJECTS = 'https://prod-04.brazilsouth.logic.azure.com:443/workflows/166d18ba5b5b4869ac65a3474387fd0d/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=298XlawPnXeH4RRcSjShQJsBwGc0TDgIYxBJ7Dis0xQ';

const camposCondicionais = ['idProjeto', 'nomeTask', 'descricao', 'dataInicio', 'dataFim', 'horasEstimadas'].map(id => document.getElementById(id));
const tipoRadios = document.querySelectorAll('input[name="tipo"]');

function toggleFields() {
  const isCriar = document.querySelector('input[name="tipo"]:checked').value === "criar";

  document.getElementById("blocoData").style.display = isCriar ? "none" : "block";
  document.getElementById("blocoPrioridade").style.display = isCriar ? "block" : "none";
  document.getElementById("nomeTaskGroup").style.display = isCriar ? "none" : "block";
  document.getElementById("camposExtras").style.display = isCriar ? "block" : "none";

  document.getElementById("idTask").value = "";
  document.getElementById("nomeTask").value = "";
  document.getElementById("descricao").value = "";
  document.getElementById("dataInicio").value = "";
  document.getElementById("dataFim").value = "";
  document.getElementById("horasEstimadas").value = "";
  document.getElementById("idProjeto").selectedIndex = 0;

  const isConsultar = document.querySelector('input[name="tipo"]:checked').value === "consultar";
  camposCondicionais.forEach(el => el.disabled = isConsultar);
  document.getElementById("tipoTaskGroup").style.display = isConsultar ? "none" : "block";
}

function exibirMensagem(msg, sucesso = true) {
  const mensagemEl = document.getElementById("mensagem");
  mensagemEl.className = sucesso ? "sucesso" : "erro";
  mensagemEl.textContent = msg;
  mensagemEl.style.display = "block";

  setTimeout(() => mensagemEl.style.opacity = "1", 10);
  setTimeout(() => {
    mensagemEl.style.opacity = "0";
    setTimeout(() => {
      mensagemEl.style.display = "none";
      mensagemEl.textContent = "";
    }, 500);
  }, 2000);
}

const endpoints = {
  consultar: {
    payload: () => ({
      event_name: "consultar",
      task_id: document.getElementById("idTask").value
    }),
    handleResponse: res => {
      document.getElementById("nomeTask").value = res.title || "";
      document.getElementById("descricao").value = res.description ? res.description.replace(/<[^>]*>/g, "") : "";
      document.getElementById("idProjeto").value = res.project_id || "";
      document.getElementById("dataInicio").value = res.datetime ? res.datetime.split(" ")[0] : "";
      document.getElementById("dataFim").value = res.deadline ? res.deadline.split(" ")[0] : "";
      document.getElementById("horasEstimadas").value = res.estimated_hours || "";
    }
  },
  criar: {
    payload: () => ({
      event_name: "criar",
      project_id: document.getElementById("idProjeto").value,
      title: `${document.getElementById("clienteNome").value} | ${document.getElementById("area").value} | ${document.getElementById("tipoTarefa").value}`,
      description: `<p>${document.getElementById("descricao").value}</p>`,
      prioridade: document.getElementById("prioridade").value,
      tipoItem: document.querySelector('input[name="tipoItem"]:checked')?.value || null
    }),
    handleResponse: () => {
      exibirMensagem("Tarefa criada com sucesso!", true);
    }
  }
};

async function enviarTask() {
  document.getElementById("loader").style.display = "block";

  const tipo = document.querySelector('input[name="tipo"]:checked').value;
  const endpoint = endpoints[tipo];

  if (!endpoint) {
    exibirMensagem("Tipo de solicitação não suportado.", false);
    return;
  }

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(endpoint.payload())
    });

    if (!res.ok) throw new Error("Erro ao consultar API");

    const data = await res.json();
    endpoint.handleResponse(data);
    document.getElementById("loader").style.display = "none";

    if (tipo === "consultar") {
      exibirMensagem("Dados carregados com sucesso!", true);
    }
  } catch (error) {
    console.error("Erro ao enviar ou processar:", error);
    document.getElementById("loader").style.display = "none";
    exibirMensagem("Erro ao consultar a API. Verifique o console.", false);
  }
}

async function carregarProjetos() {
  try {
    const res = await fetch(API_URL_PROJECTS, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });

    const data = await res.json();
    const projetoSelect = document.getElementById("idProjeto");
    projetoSelect.innerHTML = "";

    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Selecione um projeto";
    projetoSelect.appendChild(opt);

    data.data.forEach(proj => {
      const option = document.createElement("option");
      option.value = proj.id;
      option.textContent = proj.name;
      projetoSelect.appendChild(option);
    });
  } catch (error) {
    console.error("Erro ao carregar projetos:", error);
  }
}

tipoRadios.forEach(radio => radio.addEventListener("change", () => {
  toggleFields();
  carregarProjetos();
}));

window.addEventListener("DOMContentLoaded", () => {
  toggleFields();
  carregarProjetos();
});