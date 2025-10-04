# Contributing to Aztec Anonymous Messenger

Thank you for your interest in contributing to Aztec Anonymous Messenger. This document provides guidelines for contributing to this Aztec Noir smart contract project.

## Table of Contents
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Commit Convention](#commit-convention)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Getting Help](#getting-help)

---

## Development Setup

### Prerequisites
- **Node.js** 22.x LTS
- **Aztec CLI** 2.0.2 or higher
- **Noir/Nargo** toolchain
- **Git**

### Installation

#### 1. Install Noir
```bash
curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
noirup
```

Verify installation:
```bash
nargo --version
```

#### 2. Clone the Repository
```bash
git clone https://github.com/PQEST01/aztec-anonymous-messenger.git
cd aztec-anonymous-messenger
```

#### 3. Compile Contracts
```bash
cd aztec-private-messenger
nargo compile
```

#### 4. Run Tests
```bash
nargo test
```

---

## Project Structure

```
aztec-anonymous-messenger/
├── aztec-private-messenger/  # Main Aztec Noir contracts
├── contracts/                # Compiled contract artifacts
├── docs/                     # Documentation
│   └── devlog.md            # Development log
├── noir/                     # Utility Noir modules
├── nargo/                    # Noir toolchain files
├── Nargo.toml               # Noir project configuration
└── README.md
```

### Key Directories
- **aztec-private-messenger/** - Zero-knowledge messaging contracts
- **noir/** - Reusable Noir circuits and utilities
- **docs/** - Technical documentation
- **contracts/** - Deployment artifacts

---

## Pull Request Process

### Before Creating a PR

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feat/your-feature-name
   ```
3. **Make your changes**
4. **Test thoroughly**
5. **Commit with conventional format**
6. **Push to your fork**
   ```bash
   git push origin feat/your-feature-name
   ```

### PR Checklist

- [ ] Code compiles (`nargo compile`)
- [ ] Tests pass (`nargo test`)
- [ ] Documentation updated
- [ ] Commit messages follow convention
- [ ] No breaking changes (or documented)
- [ ] Code follows style guidelines

### Review Process

- Maintainers review within 3-5 business days
- Address feedback
- Once approved, PR will be merged

---

## Testing

### Running Tests

```bash
cd aztec-private-messenger
nargo test
```

### Writing Tests

- Place tests alongside contract files
- Use descriptive test names
- Cover edge cases
- Test ZK proof generation and verification

---

## Getting Help

### Questions or Issues?

- Open an issue on GitHub for bugs or features
- Check existing issues first
- Read documentation in `/docs`

### Communication

- Be respectful and constructive
- Provide context when asking questions
- Share relevant code and error messages

---

## Security

### Reporting Vulnerabilities

**DO NOT** open public issues for security vulnerabilities.

Instead, contact the maintainer privately to coordinate disclosure.

---

Thank you for contributing to Aztec Anonymous Messenger!