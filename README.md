
# Quiver-to-Obsidian

![cover](https://raw.github.com/Deerdev/Quiver-to-Obsidian/main/cover.png)

`Quiver-to-Obsidian` is a node.js CLI to convert a Quiver library to an Obsidian library.

## Features

- Convert all the Quiver notes to markdown files
  - Also, convert the text cell of the content to markdown
- Move all the resource files to the root dir `resources` of the new Obsidian library
- Add default file extension `.png` to the resource file which is missing file extension
- Overwrite the created time and updated time of the new markdown file, same with the quiver note file's time
- [Option] Replace some unknown image ext to png

## Install

Install this npm package:

```
npm install -g quiver-to-obsidian
```

## Usage

```
Usage: q2o [options]

Options:
  -q, --quiver-path <path>  quiver library dir path
  -o, --output-path <path>  output dir path
  -e, --ext-names [ext...]  [option] replace some unknown resource image file ext to `png`
  -h, --help                display help for command
```

Run the command below:

```
q2o -q <quiver-library-dir-path> -o <output-dir-path>
```

If you want to replace some resource file extension to `.png`, add parameter `-e`, for example, I want to replace `.awebp` and `.green` to `.png`, run the command below:

```
q2o -q /xxx/quiver.qvlibrary -o /xxx/output -e awebp green
```

```sh
# before:
![](resources/FFF4283081EF04C144EF122E5B894D2C.awebp)
![](resources/DDD5283081EF04C144EF122E5B894D3C.green)

# after
![](resources/FFF4283081EF04C144EF122E5B894D2C.png)
![](resources/DDD5283081EF04C144EF122E5B894D3C.png)
```
## Update

Update this command-line:

```
npm update -g quiver-to-obsidian
```

## Uninstall

After finished, you can remove this command-line tool by:

```
npm uninstall -g quiver-to-obsidian 
```

## Thanks

`Quiver-to-Obsidian` is inspired by [ushu/quiver](https://github.com/ushu/quiver), and it wouldn't be possible without these npm modules:

- turndown
- fs-extra
- utimes
- commander
- progress
- chalk
- ora

## Contributing

Feel free to [Open an issue](https://github.com/Deerdev/Quiver-to-Obsidian/issues/new) or submit PRs.

## License

[MIT](LICENSE) © DeerDev
