// @flow
import { t } from '@lingui/macro';
import { type I18n as I18nType } from '@lingui/core';
import * as React from 'react';
import Close from '@material-ui/icons/Close';
import ButtonBase from '@material-ui/core/ButtonBase';
import ThemeConsumer from './Theme/ThemeConsumer';
import ContextMenu, { type ContextMenuInterface } from './Menu/ContextMenu';
import { useLongTouch } from '../Utils/UseLongTouch';
import { Spacer } from './Grid';

const styles = {
  tabContentContainer: {
    width: '100%',
    position: 'relative',
    textAlign: 'initial',
    minHeight: 0,
    display: 'flex',
    flex: 1,
  },
  tabLabel: {
    maxWidth: 360,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: '15px', // Same as in Mosaic.css (for mosaic-window-title)
  },
  tabLabelAndIcon: {
    display: 'flex',
    alignItems: 'center',
    marginLeft: 10,
    marginRight: 10,
  },
  closeButton: {
    marginRight: 5,
    marginLeft: 5,
  },
};

type TabContentContainerProps = {|
  active: boolean,
  children: React.Node,
|};

/**
 * Contains the content of a tab. Two important things:
 *
 * 1) Instead of setting the "height" of hidden tabs to "0", we set "display" to "none" to avoid
 * messing with components (in particular components where you can scroll: when collapsed because of height=0,
 * they will lose they scrolling position).
 *
 * 2) shouldComponentUpdate is used to avoid updating the content of a tab that is not selected.
 */
export class TabContentContainer extends React.Component<TabContentContainerProps> {
  shouldComponentUpdate(nextProps: TabContentContainerProps) {
    return this.props.active || nextProps.active;
  }

  render() {
    const { children, active } = this.props;
    return (
      <div
        style={{
          ...styles.tabContentContainer,
          ...(active ? undefined : { display: 'none' }),
        }}
      >
        {children}
      </div>
    );
  }
}

type ClosableTabsProps = {|
  hideLabels?: boolean,
  children: React.Node,
|};

export const ClosableTabs = ({ hideLabels, children }: ClosableTabsProps) => (
  <ThemeConsumer>
    {muiTheme => {
      const tabItemContainerStyle = {
        maxWidth: '100%', // Tabs should take all width
        flexShrink: 0, // Tabs height should never be reduced
        display: hideLabels ? 'none' : 'flex',
        flexWrap: 'nowrap', // Single line of tab...
        overflowX: 'auto', // ...scroll horizontally if needed
        backgroundColor: muiTheme.closableTabs.containerBackgroundColor,
      };

      return <div style={tabItemContainerStyle}>{children}</div>;
    }}
  </ThemeConsumer>
);

export type ClosableTabProps = {|
  id?: string,
  active: boolean,
  label: ?React.Node,
  icon: ?React.Node,
  closable: boolean,
  onClose: () => void,
  onCloseOthers: () => void,
  onCloseAll: () => void,
  onClick: () => void,
  onActivated: () => void,
|};

export function ClosableTab({
  id,
  active,
  onClose,
  onCloseOthers,
  onCloseAll,
  label,
  icon,
  closable,
  onClick,
  onActivated,
}: ClosableTabProps) {
  React.useEffect(
    () => {
      if (active) {
        onActivated();
      }
    },
    [active, onActivated]
  );
  const contextMenu = React.useRef<?ContextMenuInterface>(null);

  const openContextMenu = event => {
    event.stopPropagation();
    if (contextMenu.current) {
      contextMenu.current.open(event.clientX, event.clientY);
    }
  };

  const closeOnMiddleClick = React.useCallback(
    event => {
      if (event.nativeEvent && event.nativeEvent.button === 1) {
        onClose();
      }
    },
    [onClose]
  );

  // Allow a long press to show the context menu
  const longTouchForContextMenuProps = useLongTouch(
    React.useCallback(
      event => {
        if (contextMenu.current) {
          contextMenu.current.open(event.clientX, event.clientY);
        }
      },
      [contextMenu]
    )
  );

  return (
    <ThemeConsumer>
      {muiTheme => {
        const textColor = !active
          ? muiTheme.closableTabs.textColor
          : muiTheme.closableTabs.selectedTextColor;

        return (
          <React.Fragment>
            <span
              style={{
                flexShrink: 0, // Tabs are never resized to fit in flex container
                position: 'relative',
                display: 'inline-block',
                marginRight: 1,
                backgroundColor: !active
                  ? muiTheme.closableTabs.backgroundColor
                  : muiTheme.closableTabs.selectedBackgroundColor,
              }}
            >
              <ButtonBase
                onClick={onClick}
                onAuxClick={closable ? closeOnMiddleClick : undefined}
                onContextMenu={openContextMenu}
                id={id ? `${id}-button` : undefined}
                {...longTouchForContextMenuProps}
                focusRipple
                // If the touch ripple is not disabled, the dragged preview will
                // use the size of the ripple and it will be too big.
                disableTouchRipple
              >
                <span
                  style={{
                    ...styles.tabLabelAndIcon,
                    height: muiTheme.closableTabs.height,
                    color: textColor,
                    fontFamily: muiTheme.closableTabs.fontFamily,
                  }}
                >
                  {icon}
                  {icon && label ? <Spacer /> : null}
                  {label && <span style={styles.tabLabel}>{label}</span>}
                </span>
              </ButtonBase>
              {closable && (
                <ButtonBase
                  onClick={onClose}
                  onAuxClick={closeOnMiddleClick}
                  onContextMenu={openContextMenu}
                  {...longTouchForContextMenuProps}
                  focusRipple
                >
                  <Close
                    style={{
                      ...styles.closeButton,
                      width: muiTheme.closableTabs.height / 2,
                      height: muiTheme.closableTabs.height,
                    }}
                    htmlColor={textColor}
                  />
                </ButtonBase>
              )}
            </span>
            <ContextMenu
              ref={contextMenu}
              buildMenuTemplate={(i18n: I18nType) => [
                {
                  label: i18n._(t`Close`),
                  click: onClose,
                  enabled: closable,
                },
                {
                  label: i18n._(t`Close others`),
                  click: onCloseOthers,
                },
                {
                  label: i18n._(t`Close all`),
                  click: onCloseAll,
                },
              ]}
            />
          </React.Fragment>
        );
      }}
    </ThemeConsumer>
  );
}
