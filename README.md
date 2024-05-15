# uploadcare-dump

Download all your files from [Uploadcare] to your local disk.

```shell
$ npx uploadcare-dump -c config.toml
# Done. Fetched 407 files.
```

## Usage

Uploadcare provides separate api keys per "[project]". To dump all your projects you need to provide multiple pairs of api keys.

Create a config.toml with a section for each project you want to dump. Keep that file safe, don't check it in to git.

**config.toml**

```toml
[[projects]]
name = 'blog'
publicKey = '<public key for "blog" workspace here>'
secretKey = '<secret key for "blog" workspace here>'

[[projects]]
name = 'dev'
publicKey = '<public key for workspace here>'
secretKey = '<secret key for workspace here>'
```

Running the CLI requires `node` >= 20. You can run it directly from npm via `npx` or install it globally on your system with `npm i uploadcare-dump`

```shell
$ npx uploadcare-dump --help

  Usage
    $ uploadcare-dump <command> [options]

  Available Commands
    meta     dump metadata about files
    files    use meta.json to dump files
    all      dump metadata and files
    conf     check the config.toml file contains valid keys

  Options
    -c, --config     Provide path to custom config  (default config.toml)
    -v, --version    Displays current version
    -h, --help       Displays this message
```

[Uploadcare]: https://uploadcare.com/
[project]: https://uploadcare.com/docs/start/settings/#projects
