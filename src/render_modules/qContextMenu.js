import { options } from "./options.js";
import { localEmoticonsIcon, searchIcon, imageIcon } from "./svg.js";
import { subMenuIconEl } from "./HTMLtemplate.js";
import { emoticonsList } from "./localEmoticons.js";
import { getPicUrl } from "./getPicUrl.js";
import "./wrapText.js";
import { showToast } from "./toast.js";
import { Logs } from "./logs.js";
import { createSticker } from "./createSticker.js";
const log = new Logs("右键菜单");

// 全局定时器存储
const subMenuTimers = new Map();
let contextMenuInitialized = false;

/**
 * 找出所有路径的公共前缀
 * @param {Array} paths - 路径数组
 * @returns {String} 公共前缀
 */
function findCommonPrefix(paths) {
  if (!paths.length) return "";

  // 将所有路径按 \ 分割
  const splitPaths = paths.map((p) => p.split("\\").filter(Boolean));

  // 找出最短路径的长度
  const minLength = Math.min(...splitPaths.map((p) => p.length));

  let commonPrefix = [];

  // 逐级比较
  for (let i = 0; i < minLength; i++) {
    const currentPart = splitPaths[0][i];

    // 检查所有路径在这一级是否相同
    if (splitPaths.every((p) => p[i] === currentPart)) {
      commonPrefix.push(currentPart);
    } else {
      break;
    }
  }

  return commonPrefix.join("\\");
}

/**
 * 将平铺的文件夹列表转换为树形结构
 * @param {Array} flatList - 平铺的文件夹列表
 * @returns {Array} 树形结构的文件夹列表
 */
function buildFolderTree(flatList) {
  const tree = [];
  const map = new Map();

  // 先按路径排序，确保父目录在子目录之前
  const sortedList = [...flatList].sort((a, b) => a.path.localeCompare(b.path, "en", { sensitivity: "base" }));

  // 找出公共前缀并移除
  const commonPrefix = findCommonPrefix(sortedList.map((item) => item.path));
  const prefixLength = commonPrefix ? commonPrefix.length + 1 : 0; // +1 是为了去掉分隔符

  // 创建所有节点的映射，同时去除公共前缀
  sortedList.forEach((item) => {
    const adjustedPath = item.path.substring(prefixLength);
    map.set(adjustedPath, {
      name: item.name,
      path: item.path, // 保留原始路径用于保存
      adjustedPath: adjustedPath, // 调整后的路径用于构建树
      children: [],
    });
  });

  // 构建树形结构
  sortedList.forEach((item) => {
    const adjustedPath = item.path.substring(prefixLength);
    const parts = adjustedPath.split("\\").filter(Boolean);

    if (parts.length === 1) {
      // 根级目录
      tree.push(map.get(adjustedPath));
    } else {
      // 子目录，需要找到其父目录
      const parentPath = parts.slice(0, -1).join("\\");
      const parent = map.get(parentPath);

      if (parent) {
        parent.children.push(map.get(adjustedPath));
      } else {
        // 如果父目录不存在于列表中，创建一个虚拟父目录
        const virtualParentName = parts[parts.length - 2];
        const virtualParent = {
          name: virtualParentName,
          path: (commonPrefix ? commonPrefix + "\\" : "") + parentPath, // 恢复完整路径
          adjustedPath: parentPath,
          children: [map.get(adjustedPath)],
          virtual: true,
        };
        map.set(parentPath, virtualParent);

        // 递归向上查找或创建父目录
        if (parts.length > 2) {
          const grandParentPath = parts.slice(0, -2).join("\\");
          const grandParent = map.get(grandParentPath);
          if (grandParent) {
            grandParent.children.push(virtualParent);
          } else {
            tree.push(virtualParent);
          }
        } else {
          tree.push(virtualParent);
        }
      }
    }
  });

  return tree;
}

/**
 * 创建多级子菜单
 * @param {Element} parentEl - 父元素
 * @param {Array} menuItems - 菜单项数组
 * @param {Function} callback - 回调函数
 * @param {number} level - 菜单层级
 */
function createNestedSubMenu(parentEl, menuItems, callback, level = 0) {
  const subMenuEl = document.createElement("div");
  const scrollEl = document.createElement("div");

  scrollEl.classList.add("lite-tools-scroll-box");
  subMenuEl.appendChild(scrollEl);
  subMenuEl.classList.add("lite-tools-sub-context-menu", `level-${level}`);

  // 为子菜单添加唯一标识
  const menuId = `submenu-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  subMenuEl.setAttribute("data-menu-id", menuId);
  parentEl.setAttribute("data-submenu-id", menuId);

  // 初始化坐标
  subMenuEl.style.setProperty("--top", `0vh`);
  subMenuEl.style.setProperty("--left", `0vh`);
  subMenuEl.style.setProperty("--height", `0px`);
  subMenuEl.style.setProperty("--width", `0px`);

  // 清除该菜单的所有相关定时器
  const clearMenuTimer = (id) => {
    const timer = subMenuTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      subMenuTimers.delete(id);
    }
  };

  // 设置关闭定时器
  const setCloseTimer = (id, element) => {
    clearMenuTimer(id);
    const timer = setTimeout(() => {
      element.classList.remove("show");
      // 递归关闭所有子菜单
      element.querySelectorAll(".lite-tools-sub-context-menu").forEach((child) => {
        child.classList.remove("show");
      });
    }, 300);
    subMenuTimers.set(id, timer);
  };

  // 子菜单的鼠标事件
  subMenuEl.addEventListener("mouseenter", () => {
    // 清除自己的关闭定时器
    clearMenuTimer(menuId);

    // 确保显示状态
    subMenuEl.classList.add("show");

    // 递归清除所有父级菜单的定时器并保持显示
    let currentEl = parentEl;
    while (currentEl) {
      // 清除当前元素对应的子菜单定时器
      const currentSubmenuId = currentEl.getAttribute("data-submenu-id");
      if (currentSubmenuId) {
        clearMenuTimer(currentSubmenuId);
        const currentSubmenu = document.querySelector(`[data-menu-id="${currentSubmenuId}"]`);
        if (currentSubmenu) {
          currentSubmenu.classList.add("show");
        }
      }

      // 如果当前元素是子菜单项，继续查找其父级子菜单
      if (currentEl.classList.contains("sub-context-menu-item")) {
        // 获取包含当前元素的子菜单容器
        const parentSubmenu = currentEl.closest(".lite-tools-sub-context-menu");
        if (parentSubmenu) {
          const parentSubmenuId = parentSubmenu.getAttribute("data-menu-id");
          if (parentSubmenuId) {
            clearMenuTimer(parentSubmenuId);
            parentSubmenu.classList.add("show");
          }
          // 查找触发这个子菜单的父元素
          currentEl = document.querySelector(`[data-submenu-id="${parentSubmenuId}"]`);
        } else {
          currentEl = null;
        }
      } else {
        currentEl = null;
      }
    }
  });

  subMenuEl.addEventListener("mouseleave", (event) => {
    // 检查鼠标是否移动到了父元素或子元素
    const relatedTarget = event.relatedTarget;

    // 如果移动到父元素，不关闭
    if (relatedTarget && parentEl.contains(relatedTarget)) {
      return;
    }

    // 检查是否移动到了子菜单
    const childMenus = subMenuEl.querySelectorAll(".lite-tools-sub-context-menu");
    for (let childMenu of childMenus) {
      if (relatedTarget && childMenu.contains(relatedTarget)) {
        return;
      }
    }

    // 设置关闭定时器
    setCloseTimer(menuId, subMenuEl);
  });

  // 处理滚轮事件
  subMenuEl.addEventListener("wheel", (event) => {
    event.stopPropagation();
    const maxTop = scrollEl.offsetHeight - subMenuEl.offsetHeight + 8;
    if (maxTop < 10) {
      return;
    }
    let addValue = 30;
    if (event.deltaY > 0) {
      addValue = -30;
    }
    let offsetY = (parseFloat(scrollEl.style.transform.split("translateY(")[1]) || 0) + addValue;
    if (offsetY > 0) {
      offsetY = 0;
    }
    if (offsetY < -maxTop) {
      offsetY = -maxTop;
    }
    scrollEl.style.transform = `translateY(${offsetY}px)`;
  });

  menuItems.forEach((menuData) => {
    const subMenuItemEl = document.createElement("div");
    subMenuItemEl.classList.add("sub-context-menu-item");

    // 创建文本节点和容器，确保文字和箭头在同一行
    const textSpan = document.createElement("span");
    textSpan.textContent = menuData.name;
    textSpan.style.flexGrow = "1";
    subMenuItemEl.appendChild(textSpan);

    subMenuItemEl.menuData = menuData;

    // 如果有子项，添加子菜单图标和处理逻辑
    if (menuData.children && menuData.children.length > 0) {
      subMenuItemEl.classList.add("has-submenu");
      subMenuItemEl.style.display = "flex";
      subMenuItemEl.style.alignItems = "center";
      subMenuItemEl.style.justifyContent = "space-between";

      // 创建箭头容器
      const arrowSpan = document.createElement("span");
      arrowSpan.innerHTML = subMenuIconEl;
      arrowSpan.style.flexShrink = "0";
      arrowSpan.style.marginLeft = "8px";
      subMenuItemEl.appendChild(arrowSpan);

      // 递归创建子菜单
      const childSubMenu = createNestedSubMenu(subMenuItemEl, menuData.children, callback, level + 1);

      subMenuItemEl.addEventListener("mouseenter", (event) => {
        const childMenuId = subMenuItemEl.getAttribute("data-submenu-id");
        // 清除子菜单的关闭定时器
        clearMenuTimer(childMenuId);

        const rect = event.currentTarget.getBoundingClientRect();
        childSubMenu.classList.add("show");
        childSubMenu.style.setProperty("--top", `${rect.y}px`);
        childSubMenu.style.setProperty("--left", `${rect.x + rect.width}px`);
        childSubMenu.style.setProperty("--height", `${childSubMenu.offsetHeight}px`);
        childSubMenu.style.setProperty("--width", `${childSubMenu.offsetWidth}px`);
      });

      subMenuItemEl.addEventListener("mouseleave", (event) => {
        // 检查鼠标是否移动到了子菜单
        const relatedTarget = event.relatedTarget;
        const childMenuId = subMenuItemEl.getAttribute("data-submenu-id");
        const childMenu = document.querySelector(`[data-menu-id="${childMenuId}"]`);

        if (relatedTarget && childMenu && childMenu.contains(relatedTarget)) {
          return; // 如果移动到子菜单，不关闭
        }

        // 设置子菜单的关闭定时器
        if (childMenu) {
          setCloseTimer(childMenuId, childMenu);
        }
      });
    }

    // 点击事件 - 无论是否有子菜单都可以点击
    subMenuItemEl.addEventListener("click", (event) => {
      event.stopPropagation();
      callback(event, menuData);
      // 清除所有定时器
      subMenuTimers.clear();
      // 关闭所有菜单
      document.querySelectorAll(".lite-tools-sub-context-menu").forEach((el) => el.remove());
      document.querySelector(".q-context-menu")?.remove();
    });

    scrollEl.appendChild(subMenuItemEl);
  });

  // 父元素的鼠标事件
  parentEl.addEventListener("mouseenter", (event) => {
    clearMenuTimer(menuId);
    const rect = event.currentTarget.getBoundingClientRect();
    subMenuEl.classList.add("show");
    subMenuEl.style.setProperty("--top", `${rect.y}px`);
    subMenuEl.style.setProperty("--left", `${rect.x + rect.width}px`);
    subMenuEl.style.setProperty("--height", `${subMenuEl.offsetHeight}px`);
    subMenuEl.style.setProperty("--width", `${subMenuEl.offsetWidth}px`);
  });

  parentEl.addEventListener("mouseleave", (event) => {
    // 检查鼠标是否移动到了子菜单
    const relatedTarget = event.relatedTarget;
    const submenuId = parentEl.getAttribute("data-submenu-id");
    const submenu = document.querySelector(`[data-menu-id="${submenuId}"]`);

    if (relatedTarget && submenu && submenu.contains(relatedTarget)) {
      return; // 如果移动到子菜单，不关闭
    }

    setCloseTimer(menuId, subMenuEl);
  });

  document.body.appendChild(subMenuEl);

  return subMenuEl;
}

/**
 * 右键菜单插入功能方法 - 改造版
 * @param {Element} qContextMenu - 右键菜单元素
 * @param {String} icon - SVG字符串
 * @param {String} title - 选项显示名称
 * @param {Function | [Array, Function]} args - 回调函数或子菜单数组和回调函数的组合
 */
function addQContextMenu(qContextMenu, icon, title, ...args) {
  let callback;
  let subMenu;
  let allowMainClick = false; // 新增参数，控制主菜单是否可点击

  if (args[0] instanceof Function) {
    callback = args[0];
  }
  if (args[0] instanceof Array) {
    subMenu = args[0];
  }
  if (args[1] instanceof Function) {
    callback = args[1];
  }
  if (args[2] === true) {
    allowMainClick = true; // 如果第三个参数为 true，则允许主菜单点击
  }

  if (hasLiteToolsContextMenuItem(qContextMenu, title)) {
    return;
  }

  /**
   * @type {Element}
   */
  const contextItem = createContextMenuItem(qContextMenu, icon, title);
  contextItem.dataset.liteToolsTitle = title;
  log("创建右键菜单项");
  contextItem?.style?.removeProperty("color");
  const textElement = getContextMenuTextElement(contextItem);
  if (subMenu && subMenu.length && textElement) {
    contextItem.insertAdjacentHTML("beforeend", subMenuIconEl);

    // 使用新的嵌套菜单创建函数
    const nestedTree = buildFolderTree(subMenu);
    createNestedSubMenu(contextItem, nestedTree, callback, 0);
  }
  if (contextItem.querySelector(".q-icon")) {
    contextItem.querySelector(".q-icon").innerHTML = icon;
  }
  if (contextItem.classList.contains("q-context-menu-item__text") || contextItem.classList.contains("q-menu-item__text")) {
    contextItem.textContent = title;
  } else {
    textElement.textContent = title;
  }

  // 修改点击事件逻辑 - 如果允许主菜单点击或没有子菜单，则添加点击事件
  if (callback && (!subMenu || allowMainClick)) {
    contextItem.addEventListener("click", () => {
      callback();
      // 清除所有定时器
      subMenuTimers.clear();
      qContextMenu.remove();
    });
  }
  qContextMenu.appendChild(contextItem);
}

/**
 * 判断当前 QQ 右键菜单是否已经插入过同名轻量工具箱菜单项。
 * 旧版 QQ 可能复用同一个 q-context-menu 节点，因此不能只给菜单容器打已处理标记。
 * @param {Element} qContextMenu
 * @param {String} title
 * @returns {Boolean}
 */
function hasLiteToolsContextMenuItem(qContextMenu, title) {
  return Array.from(qContextMenu.querySelectorAll(".lite-tools-context-menu-item")).some((item) => {
    return item.dataset.liteToolsTitle === title || getContextMenuTextElement(item)?.textContent === title;
  });
}

/**
 * 获取 QQ 右键菜单项里的文字节点，兼容不同 QQNT 版本的类名。
 * @param {Element} contextItem
 * @returns {Element}
 */
function getContextMenuTextElement(contextItem) {
  return (
    contextItem.querySelector(".q-context-menu-item__text") ||
    contextItem.querySelector(".q-menu-item__text") ||
    contextItem.querySelector(".content") ||
    contextItem.querySelector("span") ||
    contextItem
  );
}

/**
 * 创建右键菜单项。优先克隆 QQ 自带菜单项，找不到时手工创建一个兜底项。
 * @param {Element} qContextMenu
 * @param {String} icon
 * @param {String} title
 * @returns {Element}
 */
function createContextMenuItem(qContextMenu, icon, title) {
  const contextItem =
    qContextMenu.querySelector(`.q-context-menu-item:not([disabled="true"],.lite-tools-context-menu-item)`)?.cloneNode(true) ??
    qContextMenu.querySelector(`.q-menu-item:not([disabled="true"],.lite-tools-context-menu-item)`)?.cloneNode(true) ??
    qContextMenu.querySelector(`:scope > :not(.menu-stickers-wrapper,[disabled="true"],.lite-tools-context-menu-item)`)?.cloneNode(true);

  if (contextItem) {
    contextItem.classList.add("lite-tools-context-menu-item");
    return contextItem;
  }

  log("克隆右键菜单选项失败，使用兜底菜单项");
  const fallbackItem = document.createElement("div");
  fallbackItem.className = "q-context-menu-item lite-tools-context-menu-item";
  fallbackItem.style.display = "flex";
  fallbackItem.style.alignItems = "center";
  fallbackItem.style.gap = "8px";
  fallbackItem.style.minWidth = "120px";
  fallbackItem.style.padding = "8px 12px";
  fallbackItem.style.cursor = "pointer";

  const iconEl = document.createElement("span");
  iconEl.className = "q-icon";
  iconEl.innerHTML = icon;
  fallbackItem.appendChild(iconEl);

  const textEl = document.createElement("span");
  textEl.className = "q-context-menu-item__text";
  textEl.textContent = title;
  fallbackItem.appendChild(textEl);

  return fallbackItem;
}

/**
 * 旧版 QQNT 可直接从 appimg 本地路径文件名还原 gchat 图片 URL。
 * 新版 picData 获取失败时用它兜底，适配 9.9.20/9.9.21 一类旧 DOM。
 * @param {String} imagePath
 * @returns {String}
 */
function getLegacyPicSearchUrl(imagePath) {
  if (!imagePath) {
    return "";
  }
  const localPath = decodeURIComponent(imagePath);
  const filePathArr = localPath.split("/");
  const fileName = filePathArr[filePathArr.length - 1]?.split(".")?.[0]?.toUpperCase()?.replace("_0", "");
  if (!fileName) {
    return "";
  }
  return `https://gchat.qpic.cn/gchatpic_new/0/0-0-${fileName}/0`;
}

/**
 * 从右键目标附近提取图片地址，用于聊天记录等拿不到 msgRecord 的窗口。
 * @param {Element} target
 * @returns {String}
 */
function getImagePathFromTarget(target) {
  if (!target) {
    return "";
  }

  const imageEl =
    target.closest?.("img") ||
    target.querySelector?.("img") ||
    target.closest?.(".image-content,[style*='appimg://'],[style*='appimg:'],[src^='appimg://'],[src^='appimg:']");

  const src = imageEl?.currentSrc || imageEl?.src || imageEl?.getAttribute?.("src") || "";
  if (src) {
    return decodeURI(src.replace(/^appimg:\/\//, ""));
  }

  const inlineStyle = imageEl?.getAttribute?.("style") || target.getAttribute?.("style") || "";
  const appimgMatch = inlineStyle.match(/appimg:\/\/[^"')\s]+/);
  if (appimgMatch?.[0]) {
    return decodeURI(appimgMatch[0].replace(/^appimg:\/\//, ""));
  }

  return "";
}

/**
 * 尝试从 Vue 实例链里找 picData，兼容普通聊天和聊天记录里的图片组件。
 * @param {Element} target
 * @returns {Object|null}
 */
function getPicDataFromTarget(target) {
  let current = target;
  while (current && current !== document.body) {
    const vueList = current.__VUE__;
    if (vueList?.length) {
      for (let i = 0; i < vueList.length; i++) {
        const picData = vueList[i]?.ctx?.picData || vueList[i]?.props?.picData;
        if (picData) {
          return picData;
        }
      }
    }
    current = current.parentElement;
  }
  return null;
}

function getPicDataFromRecord(elements) {
  return elements?.find((element) => element?.picElement)?.picElement || null;
}

/**
 * 获取当前会话类型，聊天记录窗口中 msgRecord 可能缺少 chatType 时用于兜底。
 * @returns {Number|undefined}
 */
function getCurrentChatType() {
  return app?.__vue_app__?.config?.globalProperties?.$store?.state?.common_Aio?.curAioData?.chatType;
}

/**
 * 右键菜单监听
 */
function addEventqContextMenu() {
  if (contextMenuInitialized) {
    return;
  }
  contextMenuInitialized = true;

  /**
   * 划词搜索
   */
  let selectText = "";
  /**
   * 图片路径 - 搜索用
   */
  let searchImageData = null;
  let legacySearchImageUrl = "";
  /**
   * 图片，表情包路径
   */
  let imagePath = "";
  /**
   * 鼠标左键是否抬起 防止左键没松开就按右键搜索 导致搜索的内容为上一次的内容
   */
  let isLeftUp = true;
  /**
   * 判断按下的是不是右键
   */
  let isRightClick = false;
  /**
   * 监听事件名称
   */
  let eventName = "mouseup";
  /**
   * 用于生成消息表情的数据
   */
  let msgSticker = null;
  /**
   * 裁切字符串到指定长度
   * @param {String} str 选中字符串
   * @param {Number} len 裁切长度
   * @returns String
   */
  const strTruncate = function (str, len) {
    if (str.length > len) {
      return str.slice(0, len) + "...";
    }
    return str;
  };

  // 使用原生系统判断
  if (LiteLoader.os.platform !== "win32") {
    eventName = "mousedown";
  }

  document.addEventListener("mouseup", async (event) => {
    if (event.button === 0) {
      //  鼠标左键抬起就代表文字选好了
      selectText = window.getSelection().toString();
      isLeftUp = true;
    }
  });
  document.addEventListener("mousedown", async (event) => {
    if (event.button === 0) {
      isLeftUp = false;
    } else if (event.button === 2 && !isLeftUp) {
      selectText = window.getSelection().toString(); //  鼠标左键未抬起时按右键 就需要更新选中内容
    }
  });

  document.addEventListener(eventName, (event) => {
    if (event.button === 2) {
      imagePath = "";
      searchImageData = null;
      legacySearchImageUrl = "";
      msgSticker = null;
      isRightClick = true;
      selectText = window.getSelection().toString() || selectText;

      const targetPicData = getPicDataFromTarget(event.target);
      const targetImagePath = getImagePathFromTarget(event.target);
      if (targetImagePath) {
        legacySearchImageUrl = getLegacyPicSearchUrl(targetImagePath);
      }

      const messageEl = getParentElement(event.target, "message");
      if (messageEl) {
        const msgRecord = messageEl?.__VUE__?.[0]?.props?.msgRecord;
        const elements = msgRecord?.elements || [];
        // 生成表情逻辑
        if (elements.length === 1 && elements[0].textElement && options.qContextMenu.messageToImage.enabled) {
          if ([1, 2, 100].includes(getCurrentChatType())) {
            const content = elements[0].textElement.content;
            const userName = msgRecord?.sendMemberName || msgRecord?.sendNickName;
            const userUid = msgRecord?.senderUid;
            const fontFamily = getComputedStyle(messageEl).getPropertyValue("font-family");
            msgSticker = {
              userName,
              userUid,
              content,
              fontFamily,
            };
            log("符合生成条件", msgSticker);
          }
        }
        // 发送图片检测
        if (event.target.classList.contains("image-content") && elements.some((ele) => ele.picElement)) {
          imagePath = targetImagePath || decodeURI(event.target.src.replace(/^appimg:\/\//, ""));
          legacySearchImageUrl = getLegacyPicSearchUrl(imagePath);
          for (let i = 0; i < (event.target.parentElement.__VUE__?.length || 0); i++) {
            const el = event.target.parentElement.__VUE__[i];
            if (el?.ctx?.picData) {
              searchImageData = { picData: el.ctx.picData, chatType: msgRecord.chatType }; //getPicUrl();
            }
          }
          log(searchImageData);
        }
        if (!searchImageData && targetPicData) {
          searchImageData = { picData: targetPicData, chatType: msgRecord?.chatType ?? getCurrentChatType() };
        }
        if (!searchImageData) {
          const recordPicData = getPicDataFromRecord(elements);
          if (recordPicData) {
            searchImageData = { picData: recordPicData, chatType: msgRecord?.chatType ?? getCurrentChatType() };
          }
        }
        // 发送表情包检测
        if (elements.some((ele) => ele.marketFaceElement)) {
          imagePath = "qqface:" + elements.find((ele) => ele.marketFaceElement)?.marketFaceElement?.dynamicFacePath;
        }
      }
    } else {
      imagePath = "";
      searchImageData = null;
      legacySearchImageUrl = "";
      msgSticker = null;
    }
  });
  // 菜单监听
  new MutationObserver(() => {
    const qContextMenus = document.querySelectorAll(".q-context-menu");
    if (!qContextMenus.length) {
      if (!document.querySelector(".q-context-menu")) {
        // 清理所有定时器
        subMenuTimers.clear();
        document.querySelectorAll(".lite-tools-sub-context-menu").forEach((el) => el.remove());
      }
      return;
    }

    qContextMenus.forEach((qContextMenu) => {
      if (!qContextMenu) {
        if (!document.querySelector(".q-context-menu")) {
          // 清理所有定时器
          subMenuTimers.clear();
          document.querySelectorAll(".lite-tools-sub-context-menu").forEach((el) => el.remove());
        }
        return;
      }
      qContextMenu.classList.add("lite-tools-context-menu");

      if (options.qContextMenu.HighlightReplies) {
        const targetElements = qContextMenu.querySelectorAll("span.q-context-menu-item__text, span.q-menu-item__text");
        targetElements?.forEach((element) => {
          switch (element?.textContent) {
            case "复制":
              element.parentNode.style.setProperty("color", "var(--lt-q-context-copy-color)");
              break;
            case "转发":
              element.parentNode.style.setProperty("color", "var(--lt-q-context-forward-color)");
              break;
            case "收藏":
              element.parentNode.style.setProperty("color", "var(--lt-q-context-collect-color)");
              break;
            case "多选":
              element.parentNode.style.setProperty("color", "var(--lt-q-context-multiple-color)");
              break;
            case "引用":
              element.parentNode.style.setProperty("color", "var(--lt-q-context-quote-color)");
              break;
            case "回复":
              element.parentNode.style.setProperty("color", "var(--lt-q-context-quote-color)");
              break;
            case "设为精华":
              element.parentNode.style.setProperty("color", "var(--lt-q-context-essence-color)");
              break;
            case "撤回":
              element.parentNode.style.setProperty("color", "var(--lt-q-context-revoke-color)");
              break;
            case "删除":
              element.parentNode.style.setProperty("color", "var(--lt-q-context-delete-color)");
              break;
          }
        });
      }

      // 在网页搜索
      if (isRightClick && selectText.length && options.qContextMenu.wordSearch.enabled) {
        const searchText = selectText;
        addQContextMenu(qContextMenu, searchIcon, "搜索: " + strTruncate(selectText, 4), () => {
          lite_tools.openWeb(options.qContextMenu.wordSearch.searchUrl.replace("%search%", encodeURIComponent(searchText)));
        });
      }
      // 搜索图片
      if ((searchImageData || legacySearchImageUrl) && options.qContextMenu.imageSearch.enabled) {
        const _searchImageData = searchImageData;
        const _legacySearchImageUrl = legacySearchImageUrl;
        addQContextMenu(qContextMenu, searchIcon, "搜索图片", async () => {
          const rawSearchImageUrl = _searchImageData ? await getPicUrl(_searchImageData.picData, _searchImageData.chatType) : _legacySearchImageUrl;
          if (!rawSearchImageUrl || !/^https?:\/\//i.test(rawSearchImageUrl)) {
            showToast("没有拿到可搜索的图片直链", "error", 4000);
            return;
          }
          if (!(await lite_tools.checkImageUrl(rawSearchImageUrl))) {
            showToast("图片链接已失效或无法被搜索网站访问", "error", 5000);
            return;
          }
          const searchImageUrl = encodeURIComponent(rawSearchImageUrl);
          const openUrl = options.qContextMenu.imageSearch.searchUrl.replace("%search%", searchImageUrl);
          lite_tools.openWeb(openUrl);
        });
      }
      // 保存到本地表情文件夹 - 改造后支持多级嵌套
      log("图片地址", imagePath);
      if (imagePath && options.localEmoticons.enabled && options.localEmoticons.copyFileTolocalEmoticons) {
        const _imagePath = imagePath;
        const subMenuList = emoticonsList.map(({ name, path }) => ({ name, path }));
        addQContextMenu(qContextMenu, localEmoticonsIcon, "保存到本地表情", subMenuList, async (event, data) => {
          const filePathArr = _imagePath.replace(/\\/g, "/").split("/");
          const filePath = `${data.path}\\${filePathArr[filePathArr.length - 1]}`.replace(/\\/g, "/");
          if (_imagePath.startsWith("qqface:")) {
            const rawPath = _imagePath.split("qqface:")[1];
            if (await lite_tools.copyFile(rawPath + "_aio.png", filePath + "_aio.png")) {
              showToast("保存成功", "success", 3000);
            } else if (await lite_tools.copyFile(rawPath + "_thu.png", filePath + "_thu.png")) {
              showToast("保存成功", "success", 3000);
            } else if (!(await lite_tools.copyFile(rawPath, filePath + ".png"))) {
              showToast("保存失败", "error", 3000);
            }
          } else if (await lite_tools.copyFile(_imagePath, filePath)) {
            showToast("保存成功", "success", 3000);
          } else {
            showToast("保存失败", "error", 3000);
          }
        },
          true,// 修改：添加第三个参数 true，表示允许主菜单点击
        );
      }
      // 消息转图片
      if (options.qContextMenu.messageToImage.enabled && msgSticker) {
        const _msgSticker = msgSticker;
        addQContextMenu(qContextMenu, imageIcon, "转图片", () => {
          createSticker(_msgSticker);
        });
      }
    });
  }).observe(document.body, { childList: true, subtree: true });
}

/**
 * 获取父级匹配类名的元素
 * @param {Element} element 目标元素
 * @param {String} className 类名
 */
function getParentElement(element, className) {
  const parentElement = element?.parentElement;
  if (parentElement && parentElement !== document.body) {
    if (parentElement.classList.contains(className)) {
      return parentElement;
    } else {
      return getParentElement(parentElement, className);
    }
  } else {
    return null;
  }
}

export { addEventqContextMenu };
