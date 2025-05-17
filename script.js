const API_URL = 'https://prod-30.brazilsouth.logic.azure.com:443/workflows/e57b8efd7a6b472aae5371054b261c7b/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=Zw2AXHRvfhgFshDYj_9el5SdXs8oSi8NeiPqvY4hte8';
const API_URL_PROJECTS = 'https://prod-04.brazilsouth.logic.azure.com:443/workflows/166d18ba5b5b4869ac65a3474387fd0d/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=298XlawPnXeH4RRcSjShQJsBwGc0TDgIYxBJ7Dis0xQ';
const API_URL_CLIENTS = 'https://prod-14.brazilsouth.logic.azure.com:443/workflows/497655b552354c0b9b74959c0ba49120/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=vllv3DqdR6FXKq7WhzyHSxyBI6fy3OhYj6cCbAQIlEs';

const camposCondicionais = ['idProjeto', 'nomeTask', 'descricao', 'dataInicio', 'dataFim', 'horasEstimadas'].map(id => document.getElementById(id));
const tipoRadios = document.querySelectorAll('input[name="tipo"]');

function toggleFields() {
  const isCriar = document.querySelector('input[name="tipo"]:checked').value === "criar";
  document.getElementById("tipoTaskGroup").style.display = isCriar ? "block" : "none";
  document.getElementById("blocoPrioridade").style.display = isCriar ? "block" : "none";
  document.getElementById("camposExtras").style.display = isCriar ? "block" : "none";

  const isConsultar = document.querySelector('input[name="tipo"]:checked').value === "consultar";
  camposCondicionais.forEach(el => el.disabled = isConsultar);
  document.getElementById("blocoData").style.display = isConsultar ? "block" : "none";
  document.getElementById("nomeTaskGroup").style.display = isConsultar ? "block" : "none";
  document.getElementById("descricao").placeholder = isConsultar ? "" : "Descreva aqui sua tarefa\n\nObjetivo: Objetivo da tarefa.\n\nSolicitante: Solicitante da tarefa\n\nDetalhes:\n- Tópico1\n- Tópico2";

  document.getElementById("idTask").value = "";
  document.getElementById("nomeTask").value = "";
  document.getElementById("descricao").value = "";
  document.getElementById("dataInicio").value = "";
  document.getElementById("dataFim").value = "";
  document.getElementById("horasEstimadas").value = "";
  document.getElementById("idProjeto").selectedIndex = 0;
  

  //limpa sinais de erro nos campos required que estao vazios
  const requiredFields = document.querySelectorAll("[required]");
  requiredFields.forEach(field => {
      field.style.border = "";
  });

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

function convertDescription(content, to = "text") {
  if (!content) return "";

  if (to === "text") {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, "text/html");

    const result = [];

    doc.body.childNodes.forEach(node => {
      if (node.nodeName === "P") {
        const text = node.textContent.trim();
        result.push(text || ""); // preserva parágrafos vazios
      } else if (node.nodeName === "UL") {
        const items = Array.from(node.querySelectorAll("li")).map(li => `      - ${li.textContent.trim()}`);
        result.push(...items);
      } else {
        // Fallback: qualquer outro conteúdo textual
        result.push(node.textContent.trim());
      }
    });

    return result.join("\n");
  }

  // Texto → HTML
  else if (to === "html") {
    const lines = content.split(/\n/);
    const html = [];
    let inList = false;

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith("- ")) {
        if (!inList) {
          html.push("<ul>");
          inList = true;
        }
        html.push(`<li>${trimmed.slice(2)}</li>`);
      } else {
        if (inList) {
          html.push("</ul>");
          inList = false;
        }
        html.push(`<p>${trimmed || "&nbsp;"}</p>`);
      }
    }

    if (inList) html.push("</ul>"); // fecha lista final, se necessário

    return html.join("");
  }

  return content;
}


const endpoints = {
  consultar: {
    payload: () => ({
      event_name: "consultar",
      task_id: document.getElementById("idTask").value
    }),
    handleResponse: res => {
      document.getElementById("nomeTask").value = res.title || "";
      document.getElementById("descricao").value = res.description ? convertDescription(res.description, "text") : "";
      document.getElementById("idProjeto").value = res.project_id || "";
      document.getElementById("dataInicio").value = res.datetime ? res.datetime.split(" ")[0] : "";
      document.getElementById("dataFim").value = res.deadline ? res.deadline.split(" ")[0] : "";
      document.getElementById("horasEstimadas").value = res.estimated_hours || "";
      exibirMensagem("Dados carregados com sucesso!", true);
    }
  },
  criar: {
    payload: () => ({
      event_name: "criar",
      project_id: document.getElementById("idProjeto").value,
      title: `${document.getElementById("idClient").value} | ${document.getElementById("area").value} | ${document.getElementById("tipoTarefa").value}`,
      description: convertDescription(document.getElementById("descricao").value, "html"),
      prioridade: document.getElementById("prioridade").value,
      tipoItem: document.querySelector('input[name="tipoItem"]:checked')?.value || null
    }),
    handleResponse: () => {
      exibirMensagem("Tarefa criada com sucesso!", true);
    }
  }
};

async function enviarTask() {

  const tipo = document.querySelector('input[name="tipo"]:checked').value;
  const endpoint = endpoints[tipo];

  if (!endpoint) {
    exibirMensagem("Tipo de solicitação não suportado.", false);
    return;
  }

  const requiredFields = document.querySelectorAll("[required]");
  let allValid = true;

  requiredFields.forEach(field => {
    const value = field.value.trim();
    if (!value && field.style.display != "none" && !field.disabled) {
      field.style.border = "1px solid red";
      allValid = false;
    } else {
      field.style.border = ""; // limpa o erro se corrigido
    }
  });

  if(allValid == true){

    document.getElementById("loader").style.display = "block";

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

    } catch (error) {
      console.error("Erro ao enviar ou processar:", error);
      document.getElementById("loader").style.display = "none";
      exibirMensagem("Erro ao consultar a API. Verifique o console.", false);
    }
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

async function carregarClientes() {
  try {
    const res = await fetch(API_URL_CLIENTS, {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });

    const data = await res.json();
    const clientSelect = document.getElementById("idClient");
    clientSelect.innerHTML = "";

    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Selecione um cliente";
    clientSelect.appendChild(opt);

    data.data.forEach(client => {
      const option = document.createElement("option");
      option.value = client.id;
      option.textContent = client.name;
      clientSelect.appendChild(option);
    });
  } catch (error) {
    console.error("Erro ao carregar clientes:", error);
  }
}

tipoRadios.forEach(radio => radio.addEventListener("change", () => {
  toggleFields();
}));

window.addEventListener("DOMContentLoaded", () => {
  toggleFields();
  carregarProjetos();
  carregarClientes();
});