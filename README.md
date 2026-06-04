# Veridoctor client

This is the veridoctor client facing application.

Note **pnpm run <command>** and **pnpm exec turbo <command>** are used interchangeably, they both achieve the same goal.

## Technologies used

- [TypeScript](https://www.typescriptlang.org/) for static type checking
- [ESLint](https://eslint.org/) for code linting
- [Prettier](https://prettier.io) for code formatting
- [Pnpm](https://pnpm.io/) for package management
- [turborepo](https://turborepo.com/docs) for monorepo management

## 🛠️ Getting started

### 1. Installations

- Ensure [git](https://git-scm.com/) is installed.
- Ensure pnpm is installed if not
  [install it](https://pnpm.io/installation).
- (optional) Install turborepo globally, installation instructions can be found [here](https://turborepo.com/docs/getting-started/installation)

### 2. Development

clone and install the neccessary dependencies.

```sh
git clone git@github.com:Veridoctor-limited/veridoctor-client.git

cd veridoctor-client

pnpm install
```

**Running the development server**

To run all applications

```sh
pnpm exec turbo dev
```

To run a specific application filter using the app name

```sh
pnpm exec turbo dev --filter=web
```

### 3. Building apps

1. **Building without docker**

- To build all apps

```sh
pnpm run build
```

- To build a specific app use the filter arg

```sh
pnpm run build --filter=web
```

2. **Building with docker**

- Run the docker image you want to build, _example building the web docker image_

```sh
docker build -f /apps/web/Dockerfile -t web:latest
```

- Run the image

```sh
docker run -p 3000:3000 web:latest
```

## 🎨 Using the design system

### 1. Components

- Import the component you want to use from '@veridoctor/design/components'

```jsx
import { Button } from "@veridoctor/design/components";

export default function Page() {
  return <Button>Click me</Button>;
}
```

### 2. Icons

- Import the Icon you want to use from '@veridoctor/design/icons'

```jsx
import { Video } from "@veridoctor/design/icons"

export default function Page() {
    return (
        <div>
            <p>Video calls <Video /></>
        </div>
    )
}
```

## 📂 Project Structure

Below is the project tree structure

```sh
├── apps # a collection of apps present in this repo
│   ├── telehealth
│   |── web
|   |__ Dockerfile # a production dockerfile for the app
|   |__ ...
|
├── packages # contains shared packages used accross all apps
│   ├── design # The shared design system accross the all apps
│
└── ...

```

### Apps

- `telehealth`: The veridoctor [telehealth](https://nextjs.org/) application
- `web`: The [veridoctor](https://www.veridoctor.com) web application
- ...

### Packages

- `@veridoctor/design`: a shared design system that contains global styles, shared components and icons shared accross all applications.
- ...

## Useful Links

Checkout the developer documentation
Learn more about Turborepo and core technologies we use:

1. **Turborepo**

- [Tasks](https://turborepo.com/docs/crafting-your-repository/running-tasks)
- [Caching](https://turborepo.com/docs/crafting-your-repository/caching)
- [Remote Caching](https://turborepo.com/docs/core-concepts/remote-caching)
- [Filtering](https://turborepo.com/docs/crafting-your-repository/running-tasks#using-filters)
- [Configuration Options](https://turborepo.com/docs/reference/configuration)
- [CLI Usage](https://turborepo.com/docs/reference/command-line-reference)

1. **Docker**

- [Docker](https://docs.docker.com/)
