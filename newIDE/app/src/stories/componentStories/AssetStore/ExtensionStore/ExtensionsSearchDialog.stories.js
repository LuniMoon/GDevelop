// @flow
import * as React from 'react';
import { action } from '@storybook/addon-actions';

import muiDecorator from '../../../ThemeDecorator';
import paperDecorator from '../../../PaperDecorator';
import ExtensionsSearchDialog from '../../../../AssetStore/ExtensionStore/ExtensionsSearchDialog';
import { I18n } from '@lingui/react';
import EventsFunctionsExtensionsProvider from '../../../../EventsFunctionsExtensionsLoader/EventsFunctionsExtensionsProvider';
import { ExtensionStoreStateProvider } from '../../../../AssetStore/ExtensionStore/ExtensionStoreContext';
import { testProject } from '../../../GDevelopJsInitializerDecorator';

export default {
  title: 'AssetStore/ExtensionStore/ExtensionSearchDialog',
  component: ExtensionsSearchDialog,
  decorators: [paperDecorator, muiDecorator],
};

export const Default = () => (
  <I18n>
    {({ i18n }) => (
      <EventsFunctionsExtensionsProvider
        i18n={i18n}
        makeEventsFunctionCodeWriter={() => null}
        eventsFunctionsExtensionWriter={null}
        eventsFunctionsExtensionOpener={null}
      >
        <ExtensionStoreStateProvider>
          <ExtensionsSearchDialog
            project={testProject.project}
            onClose={action('onClose')}
            onInstallExtension={action('onInstallExtension')}
            onCreateNew={action('onCreateNew')}
          />
        </ExtensionStoreStateProvider>
      </EventsFunctionsExtensionsProvider>
    )}
  </I18n>
);
