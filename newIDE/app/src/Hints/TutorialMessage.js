// @flow
import { I18n } from '@lingui/react';
import { Trans } from '@lingui/macro';
import * as React from 'react';
import PreferencesContext from '../MainFrame/Preferences/PreferencesContext';
import AlertMessage from '../UI/AlertMessage';
import Window from '../Utils/Window';
import RaisedButton from '../UI/RaisedButton';
import YouTubeIcon from '@material-ui/icons/YouTube';
import MenuBookIcon from '@material-ui/icons/MenuBook';
import { type Tutorial } from '../Utils/GDevelopServices/Tutorial';

type Props = {|
  tutorial: Tutorial,
|};

/**
 * Show a link to a tutorial that can be permanently hidden. Hidden tutorials
 * will be stored in preferences.
 */
const TutorialMessage = ({ tutorial }: Props) => {
  const { showTutorialHint } = React.useContext(PreferencesContext);
  return (
    <I18n>
      {({ i18n }) => (
        <AlertMessage
          kind={'info'}
          children={tutorial.title}
          renderLeftIcon={() => (
            <img
              alt=""
              style={{
                maxWidth: 128,
                maxHeight: 128,
                borderRadius: 4,
              }}
              src={tutorial.thumbnailUrl}
            />
          )}
          renderRightButton={() => (
            <RaisedButton
              icon={
                tutorial.type === 'video' ? <YouTubeIcon /> : <MenuBookIcon />
              }
              label={
                tutorial.type === 'video' ? (
                  <Trans>Watch the tutorial</Trans>
                ) : (
                  <Trans>Read the tutorial</Trans>
                )
              }
              onClick={() => {
                Window.openExternalURL(tutorial.link);
              }}
            />
          )}
          onHide={() => {
            showTutorialHint(tutorial.id, false);
          }}
        />
      )}
    </I18n>
  );
};

export default TutorialMessage;
