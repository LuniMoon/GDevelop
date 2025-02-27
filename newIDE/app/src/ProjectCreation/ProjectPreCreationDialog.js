// @flow
import { Trans } from '@lingui/macro';
import Refresh from '@material-ui/icons/Refresh';
import * as React from 'react';

import Dialog from '../UI/Dialog';
import FlatButton from '../UI/FlatButton';
import RaisedButton from '../UI/RaisedButton';
import { Column, Spacer } from '../UI/Grid';
import LocalFolderPicker from '../UI/LocalFolderPicker';
import TextField from '../UI/TextField';

import generateName from '../Utils/ProjectNameGenerator';
import optionalRequire from '../Utils/OptionalRequire';
import { findEmptyPathInDefaultFolder } from './LocalPathFinder';
import { type ProjectCreationSettings } from './CreateProjectDialog';

const remote = optionalRequire('@electron/remote');
const app = remote ? remote.app : null;

type Props = {|
  open: boolean,
  isOpening?: boolean,
  onClose: () => void,
  onCreate: ProjectCreationSettings => void | Promise<void>,
|};

const ProjectPreCreationDialog = ({
  open,
  isOpening,
  onClose,
  onCreate,
}: Props): React.Node => {
  const [projectNameError, setProjectNameError] = React.useState<?React.Node>(
    null
  );
  const [projectName, setProjectName] = React.useState<string>(() =>
    generateName()
  );
  const [outputPath, setOutputPath] = React.useState<string>(() =>
    app ? findEmptyPathInDefaultFolder(app) : ''
  );

  const onValidate = React.useCallback(
    () => {
      if (isOpening) return;

      setProjectNameError(null);
      if (!projectName) {
        setProjectNameError(
          <Trans>Please enter a name for your project.</Trans>
        );
        return;
      }
      onCreate({ projectName, outputPath: app ? outputPath : undefined });
    },
    [onCreate, projectName, outputPath, isOpening]
  );

  const _onChangeProjectName = React.useCallback(
    (event, text) => {
      if (projectNameError) setProjectNameError(null);
      setProjectName(text);
    },
    [setProjectName, projectNameError]
  );

  return (
    <Dialog
      title={<Trans>New Project</Trans>}
      maxWidth="sm"
      open={open}
      onApply={onValidate}
      onRequestClose={onClose}
      actions={[
        <FlatButton
          disabled={isOpening}
          key="cancel"
          label={<Trans>Cancel</Trans>}
          onClick={onClose}
        />,
        <RaisedButton
          primary
          disabled={isOpening}
          key="create"
          label={<Trans>Create project</Trans>}
          onClick={onValidate}
          id="create-project-button"
        />,
      ]}
      id="project-pre-creation-dialog"
    >
      <Column noMargin>
        <TextField
          type="text"
          errorText={projectNameError}
          disabled={isOpening}
          value={projectName}
          onChange={_onChangeProjectName}
          floatingLabelText={<Trans>Project name</Trans>}
          endAdornment={
            <Refresh onClick={() => setProjectName(generateName())} />
          }
        />
        {app && (
          <>
            <Spacer />
            <LocalFolderPicker
              fullWidth
              value={outputPath}
              onChange={setOutputPath}
              type="create-game"
            />
          </>
        )}
      </Column>
    </Dialog>
  );
};

export default ProjectPreCreationDialog;
