const API = "https://api.github.com";
const form = document.querySelector("#analysis-form");
const profileInput = document.querySelector("#github-profile");
const jobInput = document.querySelector("#job-description");
const results = document.querySelector("#results");
const submitButton = form.querySelector("button[type='submit']");

const skillPatterns = [
  ["TypeScript", /\btypescript\b/i], ["JavaScript", /\bjavascript\b/i], ["Python", /\bpython\b/i],
  ["Java", /\bjava\b/i], ["C#", /(?:^|[^a-z0-9])c#(?=$|[^a-z0-9])|\bcsharp\b/i], ["C++", /(?:^|[^a-z0-9])c\+\+(?=$|[^a-z0-9])/i], ["Go", /\bgolang\b|(?:^|[^a-z0-9])go(?=$|[^a-z0-9])/i],
  ["Rust", /\brust\b/i], ["PHP", /\bphp\b/i], ["Ruby", /\bruby\b/i], ["Kotlin", /\bkotlin\b/i], ["Swift", /\bswift\b/i],
  ["Dart", /\bdart\b/i], ["SQL", /\bsql\b/i], ["HTML", /\bhtml\b/i], ["CSS", /\bcss\b/i], ["React", /\breact(?:\.js)?\b/i],
  ["Next.js", /\bnext(?:\.js|js)\b/i], ["Vue", /\bvue(?:\.js)?\b/i], ["Angular", /\bangular\b/i], ["Svelte", /\bsvelte\b/i],
  ["Node.js", /\bnode(?:\.js|js)\b/i], ["Express", /\bexpress(?:\.js)?\b/i], ["NestJS", /\bnestjs\b/i], ["Django", /\bdjango\b/i],
  ["Flask", /\bflask\b/i], ["FastAPI", /\bfastapi\b/i], ["Spring", /\bspring(?: boot)?\b/i], [".NET", /(?:^|[^a-z0-9])\.net(?=$|[^a-z0-9])|\bdotnet\b/i],
  ["Laravel", /\blaravel\b/i], ["PostgreSQL", /\bpostgres(?:ql)?\b/i], ["MySQL", /\bmysql\b/i], ["MongoDB", /\bmongodb\b/i],
  ["Redis", /\bredis\b/i], ["Docker", /\bdocker\b/i], ["Kubernetes", /\bkubernetes\b|\bk8s\b/i], ["AWS", /\baws\b|amazon web services/i],
  ["Azure", /\bazure\b/i], ["Google Cloud", /\bgoogle cloud\b|\bgcp\b/i], ["GitHub Actions", /\bgithub actions\b/i],
  ["Terraform", /\bterraform\b/i], ["GraphQL", /\bgraphql\b/i], ["REST", /\brest(?:ful)? api\b/i], ["Tailwind CSS", /\btailwind(?: css)?\b/i],
  ["Pandas", /\bpandas\b/i], ["TensorFlow", /\btensorflow\b/i], ["PyTorch", /\bpytorch\b/i], ["Figma", /\bfigma\b/i],
];

const keyWords = new Set([
  "python", "ia", "ml", "machine", "learning",
  "estatistica", "science", "ETL", "ELT", "pandas", "numpy",
  "scikit-learn", "matplot", "seaborn", 
  "tensorflow", "pytorch", "llm", "deep", "learning",
  "r", "rstudio", "caret", "dplyr", "shiny",
  "automação", "automacao", "agente", "n8n", 
  "engenharia", "prompts", 
  "java", "c" , "c#", "c++", "go", "rust", "php", 
  "ruby", "kotlin", "swift", 
  "dart", "flutter", "android", "studio", 
  "typescript", "javascript", "js", 
  "html", "css", "react", "next.js",
  "vue", "angular", "svelte", "node.js", 
  "express", "nestjs", "django", "flask", 
  "fastapi", "spring", ".net", "laravel", "sql", 
  "postgresql", "mysql", "mongodb", "redis",
  "docker", "kubernetes", "aws", "azure", "gcp", "google", "cloud", 
  "terraform", "graphql", "figma", "miro",
  "lucidchart", "visualização", "dashboard", "vercel",  
  "excel", "power", "bi", "streamlit", "looker", "modelagem",
  "databricks", "pyspark", "spark", "hadoop",
  "airflow", "pipelines",
  
]);


function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function profileUsername(value) {
  const trimmed = value.trim();
  if (!trimmed) throw new Error("Informe um usuário ou link de perfil do GitHub.");
  let username = trimmed;
  if (trimmed.includes("://") || trimmed.includes("github.com/")) {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    if (!/[.]?github[.]com$/i.test(url.hostname)) throw new Error("Use um perfil hospedado em github.com.");
    username = url.pathname.split("/").filter(Boolean)[0] || "";
  }
  if (!/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(username)) {
    throw new Error("Não consegui identificar um nome de usuário válido nesse endereço.");
  }
  return username;
}

async function githubJson(path) {
  const response = await fetch(`${API}${path}`, { headers: { Accept: "application/vnd.github+json" } });
  if (response.status === 404) throw new Error("Esse perfil não foi encontrado ou não está público.");
  if (response.status === 403 || response.status === 429) throw new Error("O limite temporário de consultas públicas do GitHub foi atingido. Aguarde um pouco e tente novamente.");
  if (!response.ok) throw new Error(`O GitHub respondeu com erro (${response.status}). Tente novamente mais tarde.`);
  return response.json();
}

async function publicRepos(username) {
  const collected = [];
  for (let page = 1; page <= 3; page += 1) {
    const batch = await githubJson(`/users/${encodeURIComponent(username)}/repos?per_page=100&sort=updated&page=${page}`);
    collected.push(...batch);
    if (batch.length < 100) break;
  }
  return collected;
}

function decodeReadme(content) {
  try {
    const binary = atob(content.replace(/\s/g, ""));
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new TextDecoder().decode(bytes).slice(0, 12000);
  } catch {
    return "";
  }
}

function cleanMarkdown(markdown = "") {
  return markdown
    .replace(/```[\s\S]*?```/g, " ").replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1").replace(/<[^>]+>/g, " ")
    .replace(/[`*_>#|]/g, " ").replace(/\s+/g, " ").trim();
}

async function attachReadmes(repos) {
  const readmes = new Map();
  let nextIndex = 0;
  async function readmeFor(repo) {
    const branch = (repo.default_branch || "HEAD").split("/").map(encodeURIComponent).join("/");
    const base = `https://raw.githubusercontent.com/${repo.full_name.split("/").map(encodeURIComponent).join("/")}/${branch}/`;
    for (const filename of ["README.md", "README", "README.rst", "README.txt", "README.markdown", "readme.md"]) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch(`${base}${filename}`, { signal: controller.signal });
        if (response.ok) {
          const content = (await response.text()).slice(0, 12000);
          return { content, status: content.trim() ? "found" : "missing" };
        }
        if (response.status !== 404) return { content: "", status: "unavailable" };
      } catch {
        return { content: "", status: "unavailable" };
      } finally {
        clearTimeout(timeout);
      }
    }
    return { content: "", status: "missing" };
  }
  async function worker() {
    while (nextIndex < repos.length) {
      const repo = repos[nextIndex++];
      readmes.set(repo.id, await readmeFor(repo));
    }
  }
  await Promise.all(Array.from({ length: Math.min(8, repos.length) }, worker));
  return readmes;
}

function readmeText(readmes, repo) {
  return readmes.get(repo.id)?.content || "";
}

function readmePointsToRelatedRepo(repo, target, readmes) {
  const readme = readmeText(readmes, repo);
  const [owner, name] = target.full_name.split("/").map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const linkPattern = new RegExp(`(?:https?:\\/\\/)?(?:www\\.)?github\\.com\\/${owner}\\/${name}(?:\\.git)?(?=$|[/?#)\\s"'<>])`, "i");
  return linkPattern.test(readme);
}

function primaryProjectFirst(left, right, readmes, roleTerms) {
  const leftRoleTerms = roleTerms.filter((term) => evidenceHasTerm(readmeText(readmes, left), term)).length;
  const rightRoleTerms = roleTerms.filter((term) => evidenceHasTerm(readmeText(readmes, right), term)).length;
  if (leftRoleTerms !== rightRoleTerms) return rightRoleTerms - leftRoleTerms;
  const leftReadmeLength = cleanMarkdown(readmeText(readmes, left)).length;
  const rightReadmeLength = cleanMarkdown(readmeText(readmes, right)).length;
  if (leftReadmeLength !== rightReadmeLength) return rightReadmeLength - leftReadmeLength;
  if (left.stargazers_count !== right.stargazers_count) return right.stargazers_count - left.stargazers_count;
  return new Date(right.pushed_at || right.updated_at) - new Date(left.pushed_at || left.updated_at);
}

function deduplicateProjects(repos, readmes, roleTerms) {
  const parents = repos.map((_, index) => index);
  const secondaryIds = new Set();
  function root(index) {
    if (parents[index] !== index) parents[index] = root(parents[index]);
    return parents[index];
  }
  function join(left, right) {
    parents[root(right)] = root(left);
  }
  for (let left = 0; left < repos.length; left += 1) {
    for (let right = left + 1; right < repos.length; right += 1) {
      const leftPointsToRight = readmePointsToRelatedRepo(repos[left], repos[right], readmes);
      const rightPointsToLeft = readmePointsToRelatedRepo(repos[right], repos[left], readmes);
      if (leftPointsToRight) {
        join(left, right);
        secondaryIds.add(repos[right].id);
      }
      if (rightPointsToLeft) {
        join(left, right);
        secondaryIds.add(repos[left].id);
      }
    }
  }
  const groups = new Map();
  repos.forEach((repo, index) => {
    const groupRoot = root(index);
    groups.set(groupRoot, [...(groups.get(groupRoot) || []), repo]);
  });
  return [...groups.values()].map((group) => {
    const primaryCandidates = group.filter((repo) => !secondaryIds.has(repo.id));
    const repo = (primaryCandidates.length ? primaryCandidates : group).sort((left, right) => primaryProjectFirst(left, right, readmes, roleTerms))[0];
    return { repo, members: group };
  });
}

function skillEvidence(repos, readmes) {
  const counts = new Map();
  for (const repo of repos) {
    const evidence = [repo.name, repo.description, repo.language, ...(repo.topics || []), readmeText(readmes, repo)].filter(Boolean).join(" ");
    for (const [skill, pattern] of skillPatterns) {
      if (pattern.test(evidence)) counts.set(skill, (counts.get(skill) || 0) + 1);
    }
  }
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function roleTerms(description) {
  const words = description.toLocaleLowerCase("pt-BR").match(/[\p{L}\p{N}+#.]{2,}/gu) || [];
  return [...new Set(
    words
      .map((word) => word === ".net" ? word : word.replace(/^[.]+|[.]+$/g, ""))
      .filter((word) => keyWords.has(word))
  )].slice(0, 32);
}


function evidenceHasTerm(evidence, term) {
  const normalized = evidence.toLocaleLowerCase("pt-BR");
  if (term === ".net") return /\.net(?=$|[^\p{L}\p{N}])|\bdotnet\b/u.test(normalized);
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`, "u").test(normalized);
}

function analyzeRole(description, repos, readmes) {
  const terms = roleTerms(description);
  const projects = repos.map((repo) => {
    const evidence = [repo.name, repo.description, repo.language, ...(repo.topics || []), readmeText(readmes, repo)].filter(Boolean).join(" ");
    return { repo, terms: terms.filter((term) => evidenceHasTerm(evidence, term)) };
  });
  const found = terms.filter((term) => projects.some((project) => project.terms.includes(term)));
  return {
    terms,
    projectCount: repos.length,
    found,
    missing: terms.filter((term) => !found.includes(term)),
    matches: projects.filter((project) => project.terms.length),
  };
}

function formatDate(date) {
  if (!date) return "sem data";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(date));
}

function profileAge(date) {
  if (!date) return "sem atividade registrada";
  const days = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86400000));
  if (days === 0) return "hoje";
  if (days === 1) return "há 1 dia";
  if (days < 30) return `há ${days} dias`;
  if (days < 365) return `há ${Math.floor(days / 30)} meses`;
  return `há ${Math.floor(days / 365)} anos`;
}

function repoSnippet(repo, readme) {
  const description = repo.description?.trim();
  if (description) return description;
  const cleaned = cleanMarkdown(readme);
  return cleaned.length > 190 ? `${cleaned.slice(0, 187)}...` : cleaned || "Projeto complementar sem README disponível.";
}

function opportunityMarkup(analysis) {
  if (!analysis.terms.length) return `<div class="section-title"><h3>Aderência à oportunidade</h3></div><div class="verdict-box"><strong>Evidência insuficiente</strong><p>Não foram encontrados termos técnicos específicos para comparar. Inclua tecnologias ou requisitos concretos na descrição da vaga.</p></div>`;
  if (!analysis.projectCount) return `<div class="section-title"><h3>Aderência à oportunidade</h3></div><div class="verdict-box"><strong>Sem projetos com README para avaliar</strong><p>Os projetos sem README são listados como complementares e não entram na decisão sobre potencial para esta oportunidade.</p></div>`;
  const matchedProjectCount = analysis.matches.length;
  const verdict = matchedProjectCount
    ? "Potencial identificado em projetos públicos próprios"
    : "Não encontramos evidências textuais nos projetos próprios";
  const pills = (terms, className = "") => terms.length
    ? `<div class="term-pills">${terms.map((term) => `<span class="term-pill ${className}">${escapeHtml(term)}</span>`).join("")}</div>`
    : `<p class="quiet-copy">${className ? "Nenhum termo adicional desta lista apareceu nas fontes consultadas." : "Nenhum termo da vaga apareceu nas fontes consultadas."}</p>`;
  return `<div class="section-title"><h3>Aderência à oportunidade</h3><span>comparação textual</span></div>
    <div class="verdict-box"><strong>${verdict}</strong><p>${matchedProjectCount ? `Encontramos ${matchedProjectCount} projeto(s) próprio(s) com ${analysis.found.length} dos ${analysis.terms.length} termos da vaga. Esses projetos são evidências iniciais de experiência relacionada e podem justificar uma conversa técnica.` : `Nenhum dos ${analysis.terms.length} termos da vaga apareceu nos projetos próprios analisados. Isso não prova que a pessoa não tenha essas habilidades; elas podem não estar descritas publicamente.`}</p>
      <div class="term-group"><span class="term-label">Encontrados em projetos próprios</span>${pills(analysis.found)}</div>
      <div class="term-group"><span class="term-label">Não encontrados nos projetos consultados</span>${pills(analysis.missing, "missing")}</div>
      <p class="verdict-caveat">A conclusão é baseada em nome, descrição, linguagem, tópicos e README. Uma palavra ausente não prova falta de experiência; valide autoria e profundidade numa conversa técnica.</p>
    </div>`;
}

function repoCard(repo, readmes, matchedTerms = []) {
  const repoReadme = readmeText(readmes, repo);
  const repoSkills = skillPatterns.filter(([, pattern]) => pattern.test([repo.name, repo.description, repo.language, ...(repo.topics || []), repoReadme].join(" "))).map(([skill]) => skill).slice(0, 4);
  const tags = matchedTerms.length
    ? `<strong>termos: ${matchedTerms.map(escapeHtml).join(" · ")}</strong>`
    : repoSkills.length ? `<strong>${repoSkills.map(escapeHtml).join(" · ")}</strong>` : "";
  return `<article class="repo-item"><div class="repo-line"><a class="repo-name" href="${escapeHtml(repo.html_url)}" target="_blank" rel="noreferrer">${escapeHtml(repo.name)}</a></div>
    <p class="repo-description">${escapeHtml(repoSnippet(repo, repoReadme))}</p><div class="repo-meta"><span>${escapeHtml(repo.language || "linguagem não informada")}</span><span>★ ${Number(repo.stargazers_count || 0)}</span><span>atualizado ${escapeHtml(formatDate(repo.pushed_at || repo.updated_at))}</span>${tags}</div></article>`;
}

function renderResults(profile, repos, readmes, job) {
  const readmeProjects = repos.filter((repo) => readmes.get(repo.id)?.status === "found");
  const complementaryRepos = repos.filter((repo) => readmes.get(repo.id)?.status === "missing");
  const unavailableRepos = repos.filter((repo) => readmes.get(repo.id)?.status === "unavailable");
  const opportunityTerms = job.trim() ? roleTerms(job) : [];
  const projectGroups = deduplicateProjects(readmeProjects, readmes, opportunityTerms);
  const evidenceRepos = projectGroups.map(({ repo }) => repo);
  const groupReadmes = new Map(readmes);
  for (const { repo, members } of projectGroups) {
    groupReadmes.set(repo.id, {
      content: members.map((member) => readmeText(readmes, member)).filter(Boolean).join("\n\n"),
      status: "found",
    });
  }
  const skills = skillEvidence(evidenceRepos, groupReadmes);
  const languages = new Set(evidenceRepos.map((repo) => repo.language).filter(Boolean));
  const updated = [...evidenceRepos].sort((a, b) => new Date(b.pushed_at || b.updated_at) - new Date(a.pushed_at || a.updated_at))[0];
  const roleAnalysis = opportunityTerms.length ? analyzeRole(job, evidenceRepos, groupReadmes) : null;
  const recentRepos = [...evidenceRepos].sort((a, b) => new Date(b.pushed_at || b.updated_at) - new Date(a.pushed_at || a.updated_at)).slice(0, 3);
  const matchedRepos = roleAnalysis?.matches || [];

  results.innerHTML = `<div class="result-content">
    <div class="result-toolbar"><p class="result-kicker">LEITURA CONCLUÍDA · FONTES PÚBLICAS</p><button class="print-button" type="button" onclick="window.print()">Imprimir / PDF</button></div>
    <div class="profile-heading"><img class="avatar" src="${escapeHtml(profile.avatar_url)}" alt="" /><div class="profile-name"><h2>${escapeHtml(profile.name || profile.login)}</h2><a href="${escapeHtml(profile.html_url)}" target="_blank" rel="noreferrer">@${escapeHtml(profile.login)} ↗</a></div></div>
    ${profile.bio ? `<p class="bio">${escapeHtml(profile.bio)}</p>` : ""}
    <div class="metrics"><div class="metric"><span class="metric-value">${evidenceRepos.length}</span><span class="metric-label">PROJETOS PRÓPRIOS ANALISADOS</span></div><div class="metric"><span class="metric-value">${languages.size}</span><span class="metric-label">LINGUAGENS PRINCIPAIS</span></div><div class="metric"><span class="metric-value">${profileAge(updated?.pushed_at || updated?.updated_at)}</span><span class="metric-label">ÚLTIMA ATIVIDADE OBSERVADA</span></div></div>
    <div class="section-title"><h3>Tecnologias observadas</h3><span>${evidenceRepos.length} projetos próprios analisados</span></div>
    ${skills.length ? `<div class="skill-list">${skills.slice(0, 20).map(([skill, count]) => `<span class="skill-tag">${escapeHtml(skill)}<small>${count} ${count === 1 ? "projeto" : "projetos"}</small></span>`).join("")}</div>` : '<p class="quiet-copy">Não foi possível identificar tecnologias nos nomes, descrições, tópicos ou READMEs consultados.</p>'}
    ${roleAnalysis ? opportunityMarkup(roleAnalysis) : ""}
    ${roleAnalysis ? `<div class="section-title"><h3>Projetos com termos da vaga</h3><span>${matchedRepos.length} encontrado(s)</span></div>
      ${matchedRepos.length ? `<div class="repo-list">${matchedRepos.map(({ repo, terms }) => repoCard(repo, readmes, terms)).join("")}</div>` : '<p class="quiet-copy">Nenhum repositório público analisado contém os termos extraídos da vaga.</p>'}` : ""}
    <div class="section-title"><h3>Três projetos próprios com README mais recentes</h3><span>${evidenceRepos.length} elegíveis · por data de atualização</span></div>
    ${recentRepos.length ? `<div class="repo-list">${recentRepos.map((repo) => repoCard(repo, readmes)).join("")}</div>` : '<p class="quiet-copy">Nenhum projeto próprio com README foi encontrado para esta lista.</p>'}
    <div class="disclaimer"><strong>Leitura responsável.</strong> Apenas projetos principais com README lido entram na análise de habilidades e aderência. Projetos sem README e falhas de leitura são classificados internamente e não aparecem neste relatório; forks também são excluídos. Código público não comprova autoria, profundidade ou experiência profissional; confirme o contexto diretamente com a pessoa. Não use esta leitura como decisão automática de contratação.${repos.length >= 300 ? " O perfil pode ter mais projetos; esta consulta cobre até 300 dos mais recentemente atualizados." : ""}</div>
  </div>`;
}

function renderError(error) {
  results.innerHTML = `<div class="error-state"><span class="error-code">!</span><h2>Não foi possível concluir</h2><p>${escapeHtml(error.message || "Ocorreu um erro inesperado. Tente novamente.")}</p></div>`;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  submitButton.disabled = true;
  submitButton.querySelector("span").textContent = "Consultando GitHub...";
  results.setAttribute("aria-busy", "true");
  results.innerHTML = '<div class="empty-state"><p class="eyebrow">CONSULTA EM ANDAMENTO</p><h2>Reunindo evidências...</h2><p>Buscando dados públicos e descrições de projetos.</p></div>';
  try {
    const username = profileUsername(profileInput.value);
    const [profile, allRepos] = await Promise.all([githubJson(`/users/${encodeURIComponent(username)}`), publicRepos(username)]);
    const repos = allRepos.filter((repo) => !repo.fork);
    const readmes = await attachReadmes(repos);
    renderResults(profile, repos, readmes, jobInput.value);
  } catch (error) {
    renderError(error);
  } finally {
    submitButton.disabled = false;
    submitButton.querySelector("span").textContent = "Analisar perfil";
    results.setAttribute("aria-busy", "false");
  }
});