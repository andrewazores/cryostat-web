/*
 * Copyright The Cryostat Authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import '@testing-library/jest-dom';
import { authFailMessage } from '@app/ErrorView/types';
import { DeleteActiveRecordings, DeleteOrDisableWarningType } from '@app/Modal/types';
import { ActiveRecordingsTable } from '@app/Recordings/ActiveRecordingsTable';
import {
  emptyActiveRecordingFilters,
  emptyArchivedRecordingFilters,
  TargetRecordingFilters,
} from '@app/Shared/Redux/Filters/RecordingFilterSlice';
import { RootState } from '@app/Shared/Redux/ReduxStore';
import {
  ActiveRecording,
  RecordingState,
  NotificationMessage,
  Target,
  keyValueToString,
} from '@app/Shared/Services/api.types';
import { defaultServices, ServiceContext, Services } from '@app/Shared/Services/Services';
import { TargetService } from '@app/Shared/Services/Target.service';
import dayjs, { defaultDatetimeFormat } from '@i18n/datetime';
import { act, cleanup, screen, within } from '@testing-library/react';
import { of, Subject } from 'rxjs';
import { basePreloadedState, DEFAULT_DIMENSIONS, render, resize, testT } from '../utils';

const mockConnectUrl = 'service:jmx:rmi://someUrl';
const mockJvmId = 'id';
const mockTarget = {
  agent: false,
  connectUrl: mockConnectUrl,
  alias: 'fooTarget',
  jvmId: mockJvmId,
  labels: [],
  annotations: { cryostat: [], platform: [] },
};
const mockRecordingLabels = [
  {
    key: 'someLabel',
    value: 'someValue',
  },
];
const mockRecording: ActiveRecording = {
  id: 1,
  name: 'someRecording',
  downloadUrl: 'http://downloadUrl',
  reportUrl: 'http://reportUrl',
  metadata: { labels: mockRecordingLabels },
  startTime: 1234567890,
  state: RecordingState.RUNNING,
  duration: 1000, // 1000ms
  continuous: false,
  toDisk: false,
  maxSize: 0,
  maxAge: 0,
  remoteId: 998877,
};
const mockAnotherRecording = { ...mockRecording, name: 'anotherRecording', id: 1 };
const mockCreateNotification = {
  message: { target: mockConnectUrl, recording: mockAnotherRecording, jvmId: mockJvmId },
} as NotificationMessage;
const mockLabelsNotification = {
  message: {
    target: mockConnectUrl,
    recording: {
      id: 1,
      name: 'someRecording',
      metadata: { labels: [{ key: 'someLabel', value: 'someUpdatedValue' }] },
    },
    jvmId: mockJvmId,
  },
} as NotificationMessage;
const mockStopNotification = {
  message: { target: mockConnectUrl, recording: mockRecording, jvmId: mockJvmId },
} as NotificationMessage;
const mockDeleteNotification = mockStopNotification;

jest.mock('@app/Recordings/RecordingFilters', () => {
  // Already tested separately
  return {
    ...jest.requireActual('@app/Recordings/RecordingFilters'),
    RecordingFilters: jest.fn(() => {
      return <div>RecordingFilters</div>;
    }),
  };
});

jest.spyOn(defaultServices.api, 'archiveRecording').mockReturnValue(of(''));
jest.spyOn(defaultServices.api, 'deleteRecording').mockReturnValue(of(true));
jest.spyOn(defaultServices.api, 'getTargetActiveRecordings').mockReturnValue(of([mockRecording]));
jest.spyOn(defaultServices.api, 'downloadRecording').mockReturnValue(void 0);
jest.spyOn(defaultServices.api, 'grafanaDashboardUrl').mockReturnValue(of('/grafanaUrl'));
jest.spyOn(defaultServices.api, 'grafanaDatasourceUrl').mockReturnValue(of('/datasource'));
jest.spyOn(defaultServices.api, 'stopRecording').mockReturnValue(of(true));
jest.spyOn(defaultServices.api, 'uploadActiveRecordingToGrafana').mockReturnValue(of());
jest.spyOn(defaultServices.target, 'target').mockReturnValue(of(mockTarget));
jest.spyOn(defaultServices.target, 'authFailure').mockReturnValue(of());

jest.spyOn(defaultServices.reports, 'delete').mockReturnValue(void 0);

jest
  .spyOn(defaultServices.settings, 'deletionDialogsEnabledFor')
  .mockReturnValueOnce(true) // shows a popup when Delete is clicked and then deletes the recording after clicking confirmation Delete
  .mockReturnValueOnce(false) // deletes the recording when Delete is clicked w/o popup warning
  .mockReturnValue(true);

jest.spyOn(defaultServices.settings, 'datetimeFormat').mockReturnValue(of(defaultDatetimeFormat));

jest
  .spyOn(defaultServices.notificationChannel, 'messages')
  .mockReturnValueOnce(of()) // renders the recording table correctly
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of(mockCreateNotification)) // adds a recording table after receiving a notification
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of()) // updates the recording labels after receiving a notification
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of(mockLabelsNotification))

  .mockReturnValueOnce(of()) // stops a recording after receiving a notification
  .mockReturnValueOnce(of())
  .mockReturnValueOnce(of(mockStopNotification))
  .mockReturnValueOnce(of())

  .mockReturnValueOnce(of()) // removes a Recording after receiving a notification
  .mockReturnValueOnce(of(mockDeleteNotification))
  .mockReturnValue(of()); // all other tests

jest.spyOn(window, 'open').mockReturnValue(null);

describe('<ActiveRecordingsTable />', () => {
  let preloadedState: RootState;

  beforeAll(async () => {
    await act(async () => {
      resize(2400, 1080);
    });
  });

  beforeEach(async () => {
    mockRecording.metadata.labels = mockRecordingLabels;
    mockRecording.state = RecordingState.RUNNING;
    preloadedState = {
      ...basePreloadedState,
      recordingFilters: {
        list: [
          {
            target: mockTarget.connectUrl,
            active: {
              selectedCategory: 'Labels',
              filters: emptyActiveRecordingFilters,
            },
            archived: {
              selectedCategory: 'Name',
              filters: emptyArchivedRecordingFilters,
            },
          } as TargetRecordingFilters,
        ],
        _version: '0',
      },
    };
  });

  afterAll(() => {
    resize(DEFAULT_DIMENSIONS[0], DEFAULT_DIMENSIONS[1]);
  });

  afterEach(cleanup);

  it('renders the Recording table correctly', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <ActiveRecordingsTable archiveEnabled={true} toolbarBreakReference={document.body} />,
          },
        ],
      },
      preloadedState: preloadedState,
    });

    ['Create', 'Edit Labels', 'Stop', 'Delete'].map((text) => {
      const button = screen.getByText(text);
      expect(button).toBeInTheDocument();
      expect(button).toBeVisible();
    });

    ['Name', 'Start time', 'Duration', 'State', 'Labels'].map((text) => {
      const header = screen.getByText(text);
      expect(header).toBeInTheDocument();
      expect(header).toBeVisible();
    });

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBe(2);
    checkboxes.forEach((checkbox) => {
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).toBeVisible();
    });

    const name = screen.getByText(mockRecording.name);
    expect(name).toBeInTheDocument();
    expect(name).toBeVisible();

    const startTime = screen.getByText(dayjs(mockRecording.startTime).tz('UTC').format('L LTS z'));
    expect(startTime).toBeInTheDocument();
    expect(startTime).toBeVisible();

    await act(async () => {
      await user.hover(startTime);
    });

    const toolTip = await screen.findByText(dayjs(mockRecording.startTime).toISOString());
    expect(toolTip).toBeInTheDocument(); // FIXME: tooltip is available but visibility test failed

    const duration = screen.getByText(
      mockRecording.continuous || mockRecording.duration === 0 ? 'Continuous' : '1 second',
    );
    expect(duration).toBeInTheDocument();
    expect(duration).toBeVisible();

    const state = screen.getByText(mockRecording.state);
    expect(state).toBeInTheDocument();
    expect(state).toBeVisible();

    mockRecordingLabels.map(keyValueToString).forEach((entry) => {
      const label = screen.getByText(entry);
      expect(label).toBeInTheDocument();
      expect(label).toBeVisible();
    });

    const actionIcon = screen.getByLabelText(testT('RecordingActions.ARIA_LABELS.MENU_TOGGLE'));
    expect(actionIcon).toBeInTheDocument();
    expect(actionIcon).toBeVisible();
  });

  it('adds a Recording after receiving a notification', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <ActiveRecordingsTable archiveEnabled={true} />,
          },
        ],
      },
      preloadedState: preloadedState,
    });

    expect(screen.getByText('someRecording')).toBeInTheDocument();
    expect(screen.getByText('anotherRecording')).toBeInTheDocument();
  });

  it('updates the Recording labels after receiving a notification', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <ActiveRecordingsTable archiveEnabled={true} />,
          },
        ],
      },
      preloadedState: preloadedState,
    });

    expect(screen.getByText('someLabel=someUpdatedValue')).toBeInTheDocument();
    expect(screen.queryByText('someLabel=someValue')).not.toBeInTheDocument();
  });

  it('stops a Recording after receiving a notification', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <ActiveRecordingsTable archiveEnabled={true} />,
          },
        ],
      },
      preloadedState: preloadedState,
    });

    expect(screen.getByText('STOPPED')).toBeInTheDocument();
    expect(screen.queryByText('RUNNING')).not.toBeInTheDocument();
  });

  it('removes a Recording after receiving a notification', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <ActiveRecordingsTable archiveEnabled={true} />,
          },
        ],
      },
      preloadedState: preloadedState,
    });

    expect(screen.queryByText('someRecording')).not.toBeInTheDocument();
  });

  it('displays the toolbar buttons', async () => {
    render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <ActiveRecordingsTable archiveEnabled={true} toolbarBreakReference={document.body} />,
          },
        ],
      },
      preloadedState: preloadedState,
    });

    expect(screen.getByText('Create')).toBeInTheDocument();
    expect(screen.getByText('Archive')).toBeInTheDocument();
    expect(screen.getByText('Edit Labels')).toBeInTheDocument();
    expect(screen.getByText('Stop')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('routes to the Create Flight Recording form when Create is clicked', async () => {
    const { user, router } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <ActiveRecordingsTable archiveEnabled={true} toolbarBreakReference={document.body} />,
          },
        ],
      },
      preloadedState: preloadedState,
    });

    await user.click(screen.getByText('Create'));
    expect(router.state.location.pathname).toBe('/recordings/create');
  });

  it('archives the selected Recording when Archive is clicked', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <ActiveRecordingsTable archiveEnabled={true} toolbarBreakReference={document.body} />,
          },
        ],
      },
      preloadedState: preloadedState,
    });

    const checkboxes = screen.getAllByRole('checkbox');
    const selectAllCheck = checkboxes[0];
    await user.click(selectAllCheck);
    await user.click(screen.getByText('Archive'));

    const archiveRequestSpy = jest.spyOn(defaultServices.api, 'archiveRecording');

    expect(archiveRequestSpy).toHaveBeenCalledTimes(1);
    expect(archiveRequestSpy).toHaveBeenCalledWith(mockRecording.remoteId);
  });

  it('stops the selected Recording when Stop is clicked', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <ActiveRecordingsTable archiveEnabled={true} toolbarBreakReference={document.body} />,
          },
        ],
      },
      preloadedState: preloadedState,
    });

    const checkboxes = screen.getAllByRole('checkbox');
    const selectAllCheck = checkboxes[0];
    await user.click(selectAllCheck);
    await user.click(screen.getByText('Stop'));

    const stopRequestSpy = jest.spyOn(defaultServices.api, 'stopRecording');

    expect(stopRequestSpy).toHaveBeenCalledTimes(1);
    expect(stopRequestSpy).toHaveBeenCalledWith(mockRecording.remoteId);
  });

  it('opens the labels drawer when Edit Labels is clicked', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <ActiveRecordingsTable archiveEnabled={true} toolbarBreakReference={document.body} />,
          },
        ],
      },
      preloadedState: preloadedState,
    });

    const checkboxes = screen.getAllByRole('checkbox');
    const selectAllCheck = checkboxes[0];
    await user.click(selectAllCheck);
    await user.click(screen.getByText('Edit Labels'));
    expect(screen.getByText('Edit labels')).toBeInTheDocument();
  });

  it('shows a popup when Delete is clicked and then deletes the Recording after clicking confirmation Delete', async () => {
    const deleteRequestSpy = jest.spyOn(defaultServices.api, 'deleteRecording');
    const dialogWarningSpy = jest.spyOn(defaultServices.settings, 'setDeletionDialogsEnabledFor');
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <ActiveRecordingsTable archiveEnabled={true} toolbarBreakReference={document.body} />,
          },
        ],
      },
      preloadedState: preloadedState,
    });

    const checkboxes = screen.getAllByRole('checkbox');
    const selectAllCheck = checkboxes[0];
    await user.click(selectAllCheck);

    await act(async () => {
      await user.click(screen.getByText('Delete'));

      const deleteModal = await screen.findByLabelText(DeleteActiveRecordings.ariaLabel);
      expect(deleteModal).toBeInTheDocument();
      expect(deleteModal).toBeVisible();

      await user.click(screen.getByLabelText("Don't ask me again"));
      await user.click(within(screen.getByLabelText(DeleteActiveRecordings.ariaLabel)).getByText('Delete'));
    });

    expect(deleteRequestSpy).toHaveBeenCalledTimes(1);
    expect(deleteRequestSpy).toHaveBeenCalledWith(mockRecording.remoteId);
    expect(dialogWarningSpy).toHaveBeenCalledTimes(1);
    expect(dialogWarningSpy).toHaveBeenCalledWith(DeleteOrDisableWarningType.DeleteActiveRecordings, false);
  });

  it('deletes the Recording when Delete is clicked w/o popup warning', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <ActiveRecordingsTable archiveEnabled={true} toolbarBreakReference={document.body} />,
          },
        ],
      },
      preloadedState: preloadedState,
    });

    const checkboxes = screen.getAllByRole('checkbox');
    const selectAllCheck = checkboxes[0];
    await user.click(selectAllCheck);
    await user.click(screen.getByText('Delete'));

    const deleteRequestSpy = jest.spyOn(defaultServices.api, 'deleteRecording');

    expect(screen.queryByLabelText(DeleteActiveRecordings.ariaLabel)).not.toBeInTheDocument();
    expect(deleteRequestSpy).toHaveBeenCalledTimes(1);
    expect(deleteRequestSpy).toHaveBeenCalledWith(mockRecording.remoteId);
  });

  it('downloads a Recording when Download Recording is clicked', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <ActiveRecordingsTable archiveEnabled={true} />,
          },
        ],
      },
      preloadedState: preloadedState,
    });

    await act(async () => {
      await user.click(screen.getByLabelText(testT('RecordingActions.ARIA_LABELS.MENU_TOGGLE')));
      await user.click(screen.getByText('Download Recording'));
    });

    const downloadRequestSpy = jest.spyOn(defaultServices.api, 'downloadRecording');

    expect(downloadRequestSpy).toHaveBeenCalledTimes(1);
    expect(downloadRequestSpy).toHaveBeenCalledWith(mockRecording);
  });

  it('uploads a Recording to Grafana when View in Grafana is clicked', async () => {
    const { user } = render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <ActiveRecordingsTable archiveEnabled={true} />,
          },
        ],
      },
      preloadedState: preloadedState,
    });

    await act(async () => {
      await user.click(screen.getByLabelText(testT('RecordingActions.ARIA_LABELS.MENU_TOGGLE')));
      await user.click(screen.getByText('View in Grafana ...'));
    });

    const grafanaUploadSpy = jest.spyOn(defaultServices.api, 'uploadActiveRecordingToGrafana');

    expect(grafanaUploadSpy).toHaveBeenCalledTimes(1);
    expect(grafanaUploadSpy).toHaveBeenCalledWith(mockRecording.remoteId);
  });

  it('should show error view if failing to retrieve Recordings', async () => {
    const subj = new Subject<void>();
    const mockTargetSvc = {
      target: () => of(mockTarget as Target),
      authFailure: () => subj.asObservable(),
    } as TargetService;
    const services: Services = {
      ...defaultServices,
      target: mockTargetSvc,
    };

    render({
      routerConfigs: {
        routes: [
          {
            path: '/recordings',
            element: <ActiveRecordingsTable archiveEnabled={true} />,
          },
        ],
      },
      preloadedState: preloadedState,
      providers: [{ kind: ServiceContext.Provider, instance: services }],
    });

    await act(async () => subj.next());

    const failTitle = screen.getByText('Error retrieving Recordings');
    expect(failTitle).toBeInTheDocument();
    expect(failTitle).toBeVisible();

    const authFailText = screen.getByText(authFailMessage);
    expect(authFailText).toBeInTheDocument();
    expect(authFailText).toBeVisible();

    const retryButton = screen.getByText('Retry');
    expect(retryButton).toBeInTheDocument();
    expect(retryButton).toBeVisible();

    const toolbar = screen.queryByLabelText('active-recording-toolbar');
    expect(toolbar).not.toBeInTheDocument();
  });
});
