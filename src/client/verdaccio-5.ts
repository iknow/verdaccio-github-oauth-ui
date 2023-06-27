import { copyToClipboard, init, isLoggedIn } from "./plugin"

const loginButtonSelector = `[data-testid="header--button-login"]`
const logoutButtonSelector = `[data-testid="header--button-logout"]`
const dialogContentSelector = `[data-testid="registryInfo--dialog"] #simple-tabpanel-0 div`
const copyButtonSelector = `[data-testid="copy"]`

function getUsageInfo(fileName: string, fileContents: string) {
  const sourceButton = document.querySelector(copyButtonSelector)
  if (!sourceButton) return []

  const button = sourceButton.cloneNode(true) as HTMLButtonElement
  button.onclick = (event) => {
    event.preventDefault()
    event.stopPropagation()
    copyToClipboard(fileContents)
  }

  const contents = document.createElement("pre")
  contents.style.fontFamily = "monospace"
  contents.style.overflowX = "scroll"
  contents.style.backgroundColor = "whitesmoke"
  contents.style.padding = "5px"
  contents.style.borderRadius = "5px"
  contents.textContent = fileContents

  const name = document.createElement("code")
  name.style.fontFamily = "monospace"
  name.style.backgroundColor = "whitesmoke"
  name.style.color = "firebrick"
  name.style.borderRadius = "3px"
  name.style.padding = "3px"
  name.textContent = fileName

  const description = document.createElement("p")
  description.insertAdjacentText("beforeend", "Copy the following into ")
  description.appendChild(name)
  description.insertAdjacentText("beforeend", " in your home directory:")
  description.appendChild(button)

  return [description, contents]
}

function updateUsageInfo(): void {
  const loggedIn = isLoggedIn()
  if (!loggedIn) return

  const dialogContent = document.querySelector(dialogContentSelector)
  if (!dialogContent) return

  const alreadyReplaced = dialogContent.getAttribute("replaced") === "true"
  if (alreadyReplaced) return

  const authToken = localStorage.getItem("npm")
  if (!authToken) return

  const children = [
    ...getUsageInfo(
      ".yarnrc.yml",
      `enableGlobalCache: true

npmRegistries:
  //${location.host}:
    npmAlwaysAuth: true
    npmAuthToken: "${authToken}"
`,
    ),

    ...getUsageInfo(".npmrc", `//${location.host}/:_authToken=${authToken}`),
  ]

  dialogContent.replaceChildren(...children)

  dialogContent.setAttribute("replaced", "true")
}

init({
  loginButton: loginButtonSelector,
  logoutButton: logoutButtonSelector,
  updateUsageInfo,
})
