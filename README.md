# <div align="center"> Sistema de Gestión de Solicitudes  </div>
<div align="center"> 
<img src="./Assets/Readme/LogoSGDS.png" alt="LogoSGDS" width="200" />
</div>
        
<p align="justify">
Proyecto práctico desarrollado como parte de la ruta de aprendizaje U-Casual de SYC, orientado a la aplicación de conocimientos técnicos, implementación del StackTec de la organización, de manera que se pueda replicar un sistema web con arquitectura modular y configurable, semejante a los proyectos en PCC de SYC.
</p>

---

## <div align="center">📑 Tabla de Contenido</div>

- [Descripción](#descripción)
- [Propósito](#propósito)
- [Stack-Tec](#stack-tec)
- [Instalación y Ejecución](#instalación-y-ejecución)
- [Arquitectura](#arquitectura)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Estado Actual del Proyecto](#estado-actual-del-proyecto)
- [RoadMap](#roadmap)
- [Documentación](#documentación)
- [Contexto Académico y Profesional](#contexto-académico-y-profesional)
- [Autoría y Licenciamiento](#autoría-y-licenciamiento)

---
<a name="descripción"></a>
## <div align="center">📌 Descripción</div>

<p align="justify">
SGDS (Sistema de Gestión de Solicitudes) es un proyecto práctico de aprendizaje cuyo propósito es desarrollar un sistema web orientado a la gestión integral de solicitudes, expedientes y flujos de aprobación.

El proyecto surge a partir del análisis de diferentes soluciones y procesos observados durante la etapa de inducción a los proyectos y servicios de SYC, identificando elementos comunes como:
</p>

* Gestión de usuarios.
* Gestión documental.
* Radicación de solicitudes.
* Expedientes digitales.
* Flujos de aprobación.
* Auditoría.
* Reportes.
* Trazabilidad.
* Seguridad de la información.

<p align="justify">
A partir de estos elementos se plantea una solución modular y configurable que permita representar procesos administrativos de diferentes características, con una arquitectura preparada para evolucionar hacia una solución reutilizable.
</p>

<p align="justify">
El eje central del modelo de datos es el concepto de <strong>Proyecto</strong>: cada Proyecto es un espacio de trabajo (tenant) aislado, con su propio catálogo de tipos de solicitud, sus propios operadores y sus propias solicitudes. Un mismo usuario puede pertenecer a varios proyectos con roles distintos en cada uno. Sobre ese modelo, SGDS implementa actualmente <strong>9 proyectos operativos</strong> (Comfenalco, Colpensiones, IUVA, Estampillas, Infoconsumo, SYCTrace, GoTrace, Pasivos Laborales y Libro Total), cada uno con su propio flujo de trámite y campos dinámicos, más un <strong>módulo Gerencial</strong> de solo lectura con visibilidad agregada sobre los 9.
</p>

<p align="center">
  <a href="#tabla-contenido">⬆️ Volver a la Tabla de Contenido</a>
</p>

---
<a name="propósito"></a>
## <div align="center">🎯 Propósito</div>

<p align="justify">
El propósito principal es aplicar de manera práctica los conocimientos adquiridos durante la ruta de aprendizaje de la **U-Casual**, junto con los conocimientos adquiridos en la Universidad, acercando el proceso formativo a un escenario de desarrollo de software empresarial.

El proyecto busca especialmente:

* Adoptar progresivamente tecnologías utilizadas en el entorno de desarrollo de SYC.
* Aplicar buenas prácticas de ingeniería de software.
* Comprender el desarrollo de una solución desde su diseño hasta su implementación.
* Fortalecer las competencias necesarias para la incorporación posterior a una célula de trabajo.
* Experimentar con una arquitectura modular.
</p>


<p align="center">
  <a href="#tabla-contenido">⬆️ Volver a la Tabla de Contenido</a>
</p>

---
<a name="stack-tec"></a>
## <div align="center">🏗️🛠️ Stack-Tec</div>

### Backend

<table align="center">
<tr>
    <td align="center">
      <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/csharp/csharp-original.svg" width="50"/>
    </td>
    <td align="center">
      <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/dotnetcore/dotnetcore-original.svg" width="50"/>
    </td>
    <td align="center">
      <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/entityframeworkcore/entityframeworkcore-original.svg" width="50"/>
    </td>
  </tr>
  <tr>
    <td align="center"><strong>C# / .NET 10</strong></td>
    <td align="center"><strong>ASP.NET Core Web API</strong></td>
    <td align="center"><strong>Entity Framework Core 10</strong></td>
  </tr>
</table>

<p align="justify">
La API expone sus endpoints organizados por controller (19 en total), con autenticación JWT y autorización manual por claims — no se usa el atributo <code>[Authorize(Roles=...)]</code> de ASP.NET, sino que cada acción valida los claims del token (<code>esAdminSyc</code>, <code>esGerencial</code>, <code>proyecto</code>) según a qué Proyecto pertenece el usuario. La generación de documentos usa <strong>QuestPDF</strong> (PDFs) y <strong>ClosedXML</strong> (Excel), y las contraseñas se hashean con <strong>BCrypt.Net</strong>.
</p>

---

### Frontend

<table align="center">
<tr>
    <td align="center">
      <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg" width="50"/>
    </td>
    <td align="center">
      <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg" width="50"/>
    </td>
    <td align="center">
      <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tailwindcss/tailwindcss-original.svg" width="50"/>
    </td>
    <td align="center">
      <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vitejs/vitejs-original.svg" width="50"/>
    </td>
  </tr>
  <tr>
    <td align="center"><strong>React 19</strong></td>
    <td align="center"><strong>TypeScript</strong></td>
    <td align="center"><strong>Tailwind CSS v4</strong></td>
    <td align="center"><strong>Vite</strong></td>
  </tr>
</table>

<p align="justify">
El frontend es una SPA construida sobre Vite, sin librería de componentes de terceros (el UI está hecho a mano con Tailwind). El enrutamiento usa <strong>react-router-dom v7</strong>, el consumo de la API es directo con <strong>axios</strong> (sin interceptor global), y el estado global se limita al usuario autenticado (<code>AuthContext</code> + JWT decodificado con <strong>jwt-decode</strong>). Los gráficos y mapas del módulo Gerencial y de GoTrace usan <strong>recharts</strong> y <strong>Leaflet</strong> respectivamente.
</p>

---

### Base de datos

<table align="center">
<tr>
    <td align="center">
      <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postgresql/postgresql-original.svg" width="50"/>
    </td>
  </tr>
  <tr>
    <td align="center"><strong>PostgreSQL</strong></td>
  </tr>
</table>

<p align="justify">
Las tablas se mapean explícitamente a <code>snake_case</code> en <code>OnModelCreating</code>, y las migraciones se generan con <strong>EF Core Migrations</strong> (<code>dotnet ef</code>, declarado como herramienta local del repositorio en <code>.config/dotnet-tools.json</code>).
</p>

---

### Analítica y Business Intelligence

<table align="center">
  <tr>
    <td align="center">
      <img src="https://img.icons8.com/color/48/power-bi.png" alt="Power BI" width="50"/>
    </td>
  </tr>
  <tr>
    <td align="center"><strong>Power BI Embedded</strong></td>
  </tr>
</table>


<p align="justify">
El módulo Gerencial contempla la integración con <strong>Power BI Embedded</strong> para análisis avanzado (drill-down por proyecto, filtros cruzados, comparativos históricos) como complemento a los indicadores que ya calcula la propia API. Hoy esta vista existe como una pantalla de referencia que documenta honestamente lo que falta para activarla: registro de la aplicación en Azure AD, una licencia Power BI Embedded (Pro/Premium/Embedded SKU) y una decisión sobre el mecanismo de actualización de datos (DirectQuery vs. importación programada, lo que a su vez define si se necesita un gateway hacia PostgreSQL on-premise). Mientras tanto, el propio módulo Gerencial ya expone Indicadores, Tendencias y Comparativos calculados directamente por la API, sin depender de esta integración.
</p>

---

### DevOps & Herramientas

<table align="center">
<tr>
    <td align="center">
     <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/git/git-original.svg" width="50"/>
    </td>
    <td align="center">
      <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/github/github-original.svg" width="50"/>
    </td>
    <td align="center">
      <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/azuredevops/azuredevops-original.svg" width="50"/>
    </td>
    <td align="center">
      <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg" width="50"/>
    </td>
    <td align="center">
      <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/podman/podman-original.svg" width="50"/>
    </td>
    

  </tr>
  <tr>
    <td align="center"><strong>Git</strong></td>
    <td align="center"><strong>GitHub</strong></td>
    <td align="center"><strong>Azure DevOps</strong></td>
    <td align="center"><strong>Docker</strong></td>
    <td align="center"><strong>Podman</strong></td>
  </tr>
</table>

---

### API & Testing

<table align="center">
<tr>
    <td align="center">
      <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/swagger/swagger-original.svg" width="50"/>
    </td>
    <td align="center">
      <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/postman/postman-original.svg" width="50"/>
    </td>
    <td align="center">
      <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/playwright/playwright-original.svg" width="50"/>
    </td>
    <td align="center">
      🔐
    </td>
  </tr>
  <tr>
    <td align="center"><strong>Swagger</strong></td>
    <td align="center"><strong>Postman</strong></td>
    <td align="center"><strong>Playwright</strong></td>
    <td align="center"><strong>JWT</strong></td>
  </tr>
</table>

<p align="justify">
Swagger está activo en el ambiente de desarrollo (con esquema de seguridad Bearer configurado, para poder probar endpoints autenticados directamente desde la UI). <strong>Playwright</strong> está instalado en la raíz del repositorio (no dentro de <code>SGDS.Frontend</code>) para pruebas end-to-end del frontend contra el servidor de desarrollo. No existe todavía un proyecto de pruebas unitarias/integración de .NET en la solución.
</p>

---

### Inteligencia Artificial — "SGDS Intelligence"

<div align="center"> 
<img src="./Assets/Readme/Logo_SGDSIntelligence.png" alt="Logo_SGDSIntelligence" width="100" />
</div>
<p align="justify">
El módulo Gerencial incluye una sección dedicada ("SGDS Intelligence") con tres vistas construidas y en uso: <strong>Insights</strong> (observaciones automáticas sobre el comportamiento del sistema), <strong>Alertas Inteligentes</strong> (detección de riesgos: vencimientos próximos, incrementos relevantes de solicitudes, SLA bajo) y <strong>Asistente IA</strong> (interfaz de preguntas en lenguaje natural).
</p>

<p align="justify">
Hoy las tres funcionan con <strong>reglas y plantillas</strong> sobre datos ya calculados por la API — no con un modelo de lenguaje. Cada resultado trae explícito un indicador (<code>esGeneradoPorIa</code>, hoy siempre <code>false</code>) pensado para que, cuando se integre un modelo real, el cambio sea solo en el origen del texto y no en la forma de la respuesta ni en las vistas del frontend. El Asistente IA en particular es honesto sobre esto: su caja de texto está deshabilitada con el mensaje "se activará cuando se integre el modelo de IA", y ofrece atajos a las vistas de datos en su lugar — se descartó deliberadamente simular una conversación que no existe.
</p>

<p align="justify">
El alcance previsto para cuando se incorpore el modelo real: análisis documental, resumen de expedientes, clasificación de solicitudes, detección de documentación faltante, generación de respuestas sugeridas y asistencia conversacional real sobre los datos de los 9 proyectos. La implementación dependerá del avance del proyecto, el tiempo disponible y el nivel de conocimiento alcanzado durante la ruta de aprendizaje.
</p>

<p align="center">
  <a href="#tabla-contenido">⬆️ Volver a la Tabla de Contenido</a>
</p>

---
<a name="instalación-y-ejecución"></a>
# <div align="center">🚀 Instalación y Ejecución</div>

## Requisitos previos

Antes de ejecutar el proyecto se requiere tener instalado:

* **.NET SDK 10**.
* **Node.js** (LTS 20+ recomendado) — incluye npm.
* **PostgreSQL**, con una base de datos creada y su cadena de conexión configurada en <code>SGDS.Api/appsettings.json</code> (clave <code>ConnectionStrings:SgdsConnection</code>).
* Visual Studio 2022, Visual Studio Code, o el editor de preferencia.
* Git.

---

## Clonar el repositorio

```bash
git clone https://github.com/MiguelV-SYC/ProyectoSYC_MAVA.git
cd ProyectoSYC_MAVA
```

---

## Configurar secretos locales

`appsettings.json` ya no trae contraseñas ni claves reales (para que no queden expuestas en git) — se configuran una sola vez por máquina con [`dotnet user-secrets`](https://learn.microsoft.com/aspnet/core/security/app-secrets), que las guarda fuera del repositorio:

```bash
cd SGDS.Api
dotnet user-secrets set "ConnectionStrings:SgdsConnection" "Host=localhost;Port=5432;Database=sgds_db;Username=postgres;Password=TU_PASSWORD_REAL"
dotnet user-secrets set "Jwt:Key" "TU_CLAVE_JWT_REAL"
dotnet user-secrets set "Recaptcha:SecretKey" "TU_SECRET_DE_RECAPTCHA"
dotnet user-secrets set "Anthropic:ApiKey" "TU_API_KEY_DE_ANTHROPIC"
dotnet user-secrets set "Gemini:ApiKey" "TU_API_KEY_DE_GEMINI"
dotnet user-secrets set "Groq:ApiKey" "TU_API_KEY_DE_GROQ"
cd ..
```

(Pide los valores reales a quien tenga acceso al proyecto si no los tienes. Es un único comando por máquina — no hay que repetirlo en cada `dotnet run`.)

---

## Backend (SGDS.Api)

```bash
dotnet restore
dotnet build
dotnet run --project SGDS.Api
```

La API queda disponible en el puerto que indique la consola (el frontend espera <code>http://localhost:5158</code>). Las migraciones de base de datos se aplican automáticamente al arrancar (<code>Database.Migrate()</code> en <code>Program.cs</code>) — no hace falta correr <code>dotnet ef database update</code> a mano en un primer arranque. Con <code>ASPNETCORE_ENVIRONMENT=Development</code>, Swagger queda disponible en <code>/swagger</code>.

---

## Frontend (SGDS.Frontend)

```bash
cd SGDS.Frontend
npm install
npm run dev
```

El servidor de desarrollo de Vite queda disponible en <code>http://localhost:5173</code> — puerto al que está restringida la política CORS del backend (<code>Program.cs</code>), así que si se cambia el puerto del frontend hay que actualizar esa política.

---

## Pruebas end-to-end (Playwright, opcional)

```bash
npm install
npx playwright install
npx playwright test
```

Se ejecuta desde la raíz del repositorio (no desde <code>SGDS.Frontend</code>), con el backend y el frontend ya corriendo.

---

## Con contenedores (Podman)

Además de correr el proyecto de forma nativa (como se describe arriba), todo el stack puede levantarse contenedorizado con **Podman** — útil para reproducir el mismo entorno en distintas máquinas (por ejemplo, oficina y casa) sin reinstalar ni reconfigurar nada a mano. Cumple además el requisito RNF-09 del proyecto (despliegue vía contenedores).

### Requisitos previos

* **Podman Desktop** instalado, con la máquina de Podman (`podman machine`) corriendo.
* Soporte de **Compose** habilitado dentro de Podman Desktop (**Settings → Resources → Compose → Set up...**).

### Qué se contenedoriza

| Servicio | Contenedor | Se construye desde | Puerto local |
|---|---|---|---|
| Base de datos (Postgres 18) | `sgds-db` | imagen oficial `postgres:18` | `5433` → `5432` |
| API (ASP.NET Core) | `sgds-backend` | `Containerfile.backend` | `5158` → `8080` |
| Frontend (React + nginx) | `sgds-frontend` | `Containerfile.frontend` | `5173` → `8080` |

Los tres se orquestan desde `compose.yaml`, en la raíz del repo, compartiendo la red `sgds-network` y los volúmenes `sgds-pgdata` (datos de Postgres) y `sgds-almacenamiento` (archivos subidos por la app).

### Configurar el `.env`

`compose.yaml` no trae contraseñas ni claves escritas directamente — las lee de un archivo `.env` local, que **no se sube a git** (cada máquina tiene el suyo). Antes del primer arranque:

```bash
cp .env.example .env
```

Y completa los valores reales en `.env` (contraseña de la base de datos, `Jwt:Key`, `Recaptcha:SecretKey` — deben coincidir con los que ya usa el proyecto). Las variables `HTTP_PROXY` / `HTTPS_PROXY` / `NO_PROXY` solo son necesarias si se construye desde una red con proxy corporativo (como la oficina de SYC); en una red sin proxy (por ejemplo, en casa) se pueden dejar vacías.

### Levantar todo el stack

```bash
podman compose up -d --build
```

`--build` solo hace falta la primera vez, o cuando cambie el código del backend/frontend y se quiera probar la versión contenedorizada. Para apagar todo sin perder datos:

```bash
podman compose down
```

(Los volúmenes `sgds-pgdata` y `sgds-almacenamiento` no se borran con `down` — los datos persisten entre arranques.)

> Nota: para el día a día de desarrollo (cambios de código frecuentes, hot-reload) sigue siendo más ágil trabajar de forma nativa (`dotnet run` / `npm run dev`, sección de arriba) apuntando a la base de datos del contenedor `sgds-db` (expuesta en `localhost:5433`). Los contenedores completos son para validar el empaquetado real y para replicar el entorno en otra máquina.

<p align="center">
  <a href="#tabla-contenido">⬆️ Volver a la Tabla de Contenido</a>
</p>

---
<a name="arquitectura"></a>
## <div align="center">🏗️ Arquitectura</div>

<p align="justify">
El backend está organizado en 4 proyectos .NET separados (Domain, Application, Infrastructure, Api) con una dirección de dependencia clara: <strong>Domain</strong> no depende de nada; <strong>Application</strong> depende de Domain; <strong>Infrastructure</strong> depende de Domain y Application; <strong>Api</strong> depende de las tres. El Frontend es un proyecto Vite completamente separado que consume la Api solo por HTTP, sin compartir código con el backend.
</p>

<div align="center"> 
<img src="./Assets/Readme/ArquitecturaEnCapas.png" alt="ArquitecturaEnCapas" width="600" />
</div>

<p align="justify">
<strong>Importante — esto no es Clean Architecture con casos de uso.</strong> Pese a tener capas Domain/Application/Infrastructure, no hay repositorios, no hay servicios de aplicación (use cases) ni MediatR. Domain contiene entidades POCO puras sin lógica de negocio; Application solo aporta DTOs, interfaces de servicio y helpers de cálculo puro (sin paquetes NuGet propios); toda la lógica de negocio real vive en los <strong>Controllers</strong> de Api, que inyectan el <code>DbContext</code> directamente y hacen ahí mismo las consultas, la autorización y el mapeo a DTOs — el patrón esperado para código nuevo es "controller gordo con LINQ", no una capa de servicios adicional.
</p>

<p align="center">
  <a href="#tabla-contenido">⬆️ Volver a la Tabla de Contenido</a>
</p>

---
<a name="estructura-del-proyecto"></a>
# <div align="center">📁 Estructura del proyecto</div>

<p align="justify">
Estructura real del repositorio, con una separación clara de responsabilidades entre backend, frontend y documentación:
</p>

```text
ProyectoSYC_MAVA/
├── SGDS.Domain/            Entidades POCO puras (22 entidades, sin lógica de negocio)
│   └── Entities/
├── SGDS.Application/       DTOs, interfaces de servicio, helpers de cálculo puro
│   ├── DTOs/                 (18 archivos — varias clases relacionadas por archivo)
│   ├── Helpers/               CalculadoraDv, CalculadoraEstampillas, CalculadoraImpuestoConsumo...
│   └── Interfaces/            IAlmacenamientoService
├── SGDS.Infrastructure/    DbContext (EF Core) + implementaciones de servicios
│   ├── Data/                  SgdsDbContext.cs
│   ├── Migrations/            12 migraciones aplicadas
│   └── Services/               AlmacenamientoLocalService
├── SGDS.Api/               Controllers (19) — aquí vive toda la lógica de negocio
│   ├── Controllers/
│   └── Program.cs
├── SGDS.Frontend/          SPA React + Vite
│   └── src/
│       ├── pages/              49 páginas (una por ruta)
│       ├── services/           19 servicios (uno por recurso de API)
│       ├── components/         organizados por módulo
│       ├── config/, context/, hooks/, assets/
├── Assets/                 Mockups, README assets, diagramas BPMN
├── tests/                  Pruebas end-to-end con Playwright
└── SGDS.slnx               Solución .NET (formato .slnx)
```

<p align="justify">
> Esta estructura podrá seguir evolucionando conforme se incorporen nuevos módulos o funcionalidades.
</p>

<p align="center">
  <a href="#tabla-contenido">⬆️ Volver a la Tabla de Contenido</a>
</p>

---
<a name="estado-actual-del-proyecto"></a>
# <div align="center">🚧 Estado Actual del Proyecto</div>

El proyecto se encuentra en una fase de **backend y frontend funcionales**, con 9 módulos operativos y un módulo gerencial de analítica sobre ellos. Lo que queda pendiente es puntual (pruebas automatizadas de .NET, contenedores, el modelo de IA real), no estructural.

### Backend

<table align="center">
  <thead>
    <tr>
      <th align="center">Componente</th>
      <th align="center">Estado</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td align="center">Arquitectura en capas (Domain / Application / Infrastructure / Api)</td>
      <td align="center">✅ Completado</td>
    </tr>
    <tr>
      <td align="center">API REST (19 controllers)</td>
      <td align="center">✅ Completado</td>
    </tr>
    <tr>
      <td align="center">Entity Framework Core + PostgreSQL (12 migraciones)</td>
      <td align="center">✅ Completado</td>
    </tr>
    <tr>
      <td align="center">Autenticación JWT + autorización por claims</td>
      <td align="center">✅ Completado</td>
    </tr>
    <tr>
      <td align="center">Modelo multi-tenant (Proyecto / TipoSolicitud / Solicitud)</td>
      <td align="center">✅ Completado</td>
    </tr>
    <tr>
      <td align="center">Auditoría automática transversal</td>
      <td align="center">✅ Completado</td>
    </tr>
    <tr>
      <td align="center">Generación de PDF / Excel (QuestPDF, ClosedXML)</td>
      <td align="center">✅ Completado</td>
    </tr>
    <tr>
      <td align="center">Swagger</td>
      <td align="center">✅ Completado</td>
    </tr>
    <tr>
      <td align="center">Pruebas unitarias / integración (.NET)</td>
      <td align="center">⏳ Pendiente</td>
    </tr>
  </tbody>
</table>

---

### Frontend

<table align="center">
  <thead>
    <tr>
      <th align="center">Componente</th>
      <th align="center">Estado</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td align="center">React 19 + TypeScript + Vite</td>
      <td align="center">✅ Completado</td>
    </tr>
    <tr>
      <td align="center">Tailwind CSS v4 (UI propio, sin librería de componentes)</td>
      <td align="center">✅ Completado</td>
    </tr>
    <tr>
      <td align="center">Integración con la API (49 páginas, 19 servicios)</td>
      <td align="center">✅ Completado</td>
    </tr>
    <tr>
      <td align="center">Autenticación y enrutamiento por rol</td>
      <td align="center">✅ Completado</td>
    </tr>
    <tr>
      <td align="center">Pruebas end-to-end (Playwright)</td>
      <td align="center">🟡 Configurado, cobertura inicial</td>
    </tr>
  </tbody>
</table>

---

### Módulos por proyecto (multi-tenant)

<table align="center">
  <thead>
    <tr>
      <th align="center">Proyecto</th>
      <th align="center">Estado</th>
    </tr>
  </thead>
  <tbody>
    <tr><td align="center">Comfenalco</td><td align="center">✅ Completado</td></tr>
    <tr><td align="center">Colpensiones</td><td align="center">✅ Completado</td></tr>
    <tr><td align="center">IUVA</td><td align="center">✅ Completado</td></tr>
    <tr><td align="center">Estampillas</td><td align="center">✅ Completado</td></tr>
    <tr><td align="center">Infoconsumo</td><td align="center">✅ Completado</td></tr>
    <tr><td align="center">SYCTrace</td><td align="center">✅ Completado</td></tr>
    <tr><td align="center">GoTrace</td><td align="center">✅ Completado</td></tr>
    <tr><td align="center">Pasivos Laborales</td><td align="center">✅ Completado</td></tr>
    <tr><td align="center">Libro Total</td><td align="center">✅ Completado</td></tr>
    <tr><td align="center">Módulo Gerencial (perfil de solo lectura + analítica)</td><td align="center">✅ Completado</td></tr>
  </tbody>
</table>

---

### Componentes complementarios

<table align="center">
  <thead>
    <tr>
      <th align="center">Componente</th>
      <th align="center">Estado</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td align="center">Diagrama BPMN de procesos (draw.io)</td>
      <td align="center">✅ Completado</td>
    </tr>
    <tr>
      <td align="center">Power BI Embedded (Análisis Avanzado)</td>
      <td align="center">🟡 Pantalla de referencia — pendiente Azure AD y licenciamiento</td>
    </tr>
    <tr>
      <td align="center">SGDS Intelligence (Insights / Alertas / Asistente IA)</td>
      <td align="center">🟡 Base por reglas construida — modelo de IA real pendiente</td>
    </tr>
    <tr>
      <td align="center">Azure DevOps</td>
      <td align="center">🟡 En planificación</td>
    </tr>
    <tr>
      <td align="center">Docker / Podman</td>
      <td align="center">⏳ Pendiente</td>
    </tr>
  </tbody>
</table>

> Los estados del proyecto se actualizarán conforme avance la implementación.

<p align="center">
  <a href="#tabla-contenido">⬆️ Volver a la Tabla de Contenido</a>
</p>

---
<a name="roadmap"></a>
# <div align="center">🗺️ Roadmap</div>

<div align="center"> 
<img src="./Assets/Readme/RoadMap.png" alt="RoadMap" width="400" />
</div>

<p align="center">
  <a href="#tabla-contenido">⬆️ Volver a la Tabla de Contenido</a>
</p>

---
<a name="documentación"></a>
# <div align="center">📚 Documentación </div>

## API
La API está documentada con **Swagger / OpenAPI**, activo en el ambiente de desarrollo (<code>/swagger</code>), con esquema de seguridad Bearer configurado para probar endpoints autenticados. Se usa para consultar endpoints, revisar modelos, ejecutar solicitudes y validar respuestas durante el desarrollo del frontend.

---

## Proyecto

Documentación existente hoy:

* Diagrama de arquitectura en capas (<code>Assets/Readme/ArquitecturaEnCapas.png</code>).
* Modelo BPMN del estado actual de los procesos, en <code>Assets/BPMN/SGDS-Procesos-Actual.drawio</code> — proceso principal de gestión de solicitudes, subproceso de tramitación por tipo de proyecto, y subproceso de alta de operadores, con actores, pools y lanes descritos.
* Este README, como referencia de stack, estructura y estado del proyecto.

Pendiente por documentar formalmente:

* Documento de propuesta y requerimientos.
* Historias de usuario.
* Diagrama entidad-relación.
* Diagramas de secuencia.
* Manual técnico y manual de usuario.

<p align="center">
  <a href="#tabla-contenido">⬆️ Volver a la Tabla de Contenido</a>
</p>

---
<a name="contexto-académico-y-profesional"></a>
# <div align="center">🎓 Contexto Académico y Profesional </div>

<p align="justify">
SGDS se desarrolla como parte de la ruta de aprendizaje <strong>U-Casual de SYC</strong>, dentro del proceso de formación previo a la asignación a una célula de trabajo.

El proyecto busca servir como ejercicio práctico para:

* Aplicar conocimientos adquiridos durante la ruta de aprendizaje.
* Adoptar progresivamente el stack tecnológico de la organización.
* Comprender el desarrollo de soluciones empresariales.
* Fortalecer competencias de ingeniería de software.
* Facilitar la transición hacia un proyecto real dentro de la compañía.

El diferencial del proyecto no se encuentra en competir con las soluciones existentes de SYC, sino en utilizar el ejercicio como un espacio de aprendizaje práctico orientado a desarrollar una solución con tecnologías, arquitectura y prácticas cercanas a un entorno empresarial.
</p>

<p align="center">
  <a href="#tabla-contenido">⬆️ Volver a la Tabla de Contenido</a>
</p>

---
<a name="autoría-y-licenciamiento"></a>
# 📄 Autoría y Licenciamiento

<p align="center">
  <strong>Miguel Angel Villamizar Ardila</strong><br>
  Estudiante de Ingeniería de Sistemas<br>
  Universidad Cooperativa de Colombia — Bucaramanga
</p>

<div align="justify">
        <ul>
                <li>Proyecto desarrollado durante la práctica profesional en SYC.</li>
                <li>Proyecto desarrollado con fines académicos y de formación profesional dentro del contexto de la ruta de aprendizaje U-Casual.</li>
        <ul>
</div>

<p align="center">
  <a href="#tabla-contenido">⬆️ Volver a la Tabla de Contenido</a>
</p>

---