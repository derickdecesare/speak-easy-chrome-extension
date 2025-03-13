// Type declarations for the extension
declare namespace chrome {
  namespace runtime {
    const onInstalled: any;
    const onMessage: any;
    function sendMessage(
      message: any,
      callback?: (response: any) => void
    ): void;
  }

  namespace contextMenus {
    function create(options: any): void;
    const onClicked: any;

    interface OnClickData {
      menuItemId: string;
      selectionText?: string;
    }
  }

  namespace tabs {
    function sendMessage(tabId: number, message: any): void;

    interface Tab {
      id?: number;
    }
  }

  namespace storage {
    namespace sync {
      function get(
        keys: string | string[] | object,
        callback: (items: object) => void
      ): void;
      function set(items: object, callback?: () => void): void;
    }
  }
}
