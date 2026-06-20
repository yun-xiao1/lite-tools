const WORD_SEARCH_PRESETS = [
  {
    key: "bing",
    name: "Bing",
    url: "https://www.bing.com/search?q=%search%",
  },
  {
    key: "google",
    name: "Google",
    url: "https://www.google.com/search?q=%search%",
  },
  {
    key: "baidu",
    name: "百度",
    url: "https://www.baidu.com/s?wd=%search%",
  },
  {
    key: "duckduckgo",
    name: "DuckDuckGo",
    url: "https://duckduckgo.com/?q=%search%",
  },
  {
    key: "custom",
    name: "自定义",
    url: "",
  },
];

const IMAGE_SEARCH_PRESETS = [
  {
    key: "google_legacy",
    name: "Google旧版(推荐)",
    url: "https://www.google.com/searchbyimage?client=app&image_url=%search%",
  },
  {
    key: "google_lens",
    name: "GoogleLens(选完全相符)",
    url: "https://lens.google.com/uploadbyurl?url=%search%",
  },
  {
    key: "yandex_ru",
    name: "Yandex.ru(设置关过滤)",
    url: "https://yandex.ru/images/search?url=%search%",
  },
  {
    key: "yandex_com",
    name: "Yandex.com(锁区)",
    url: "https://yandex.com/images/search?url=%search%&rpt=imageview",
  },
  {
    key: "saucenao",
    name: "SauceNAO",
    url: "https://saucenao.com/search.php?url=%search%",
  },
  {
    key: "bing",
    name: "Bing",
    url: "https://www.bing.com/images/search?q=imgurl:%search%&view=detailv2&iss=sbi",
  },
  {
    key: "custom",
    name: "自定义",
    url: "",
  },
];

function findSearchPreset(presets, presetKey) {
  return presets.find((preset) => preset.key === presetKey);
}

function resolveSearchUrl(config, presets) {
  const preset = findSearchPreset(presets, config?.preset);
  if (preset?.url) {
    return preset.url;
  }
  return config?.searchUrl ?? "";
}

export { WORD_SEARCH_PRESETS, IMAGE_SEARCH_PRESETS, findSearchPreset, resolveSearchUrl };
