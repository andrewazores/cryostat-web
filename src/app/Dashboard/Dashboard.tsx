/*
 * Copyright The Cryostat Authors
 *
 * The Universal Permissive License (UPL), Version 1.0
 *
 * Subject to the condition set forth below, permission is hereby granted to any
 * person obtaining a copy of this software, associated documentation and/or data
 * (collectively the "Software"), free of charge and under any and all copyright
 * rights in the Software, and any and all patent rights owned or freely
 * licensable by each licensor hereunder covering either (i) the unmodified
 * Software as contributed to or provided by such licensor, or (ii) the Larger
 * Works (as defined below), to deal in both
 *
 * (a) the Software, and
 * (b) any piece of software and/or hardware listed in the lrgrwrks.txt file if
 * one is included with the Software (each a "Larger Work" to which the Software
 * is contributed by such licensors),
 *
 * without restriction, including without limitation the rights to copy, create
 * derivative works of, display, perform, and distribute the Software and make,
 * use, sell, offer for sale, import, export, have made, and have sold the
 * Software and the Larger Work(s), and to sublicense the foregoing rights on
 * either these or other terms.
 *
 * This license is subject to the following condition:
 * The above copyright notice and either this complete permission notice or at
 * a minimum a reference to the UPL must be included in all copies or
 * substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
import * as React from 'react';
import { Gallery, GalleryItem } from '@patternfly/react-core';
import { ServiceContext } from '@app/Shared/Services/Services';
import { Target } from '@app/Shared/Services/Target.service';
import { useSubscriptions } from '@app/utils/useSubscriptions';
import { TargetView } from '@app/TargetView/TargetView';
import { TargetDetailsWidget } from './Widgets/TargetDetailsWidget';
import { ArchivesWidget } from './Widgets/ArchivesWidget';
import { AddWidget } from './Widgets/AddWidget';
import { ScoreWidget } from './Widgets/ScoreWidget';
import { Datapoint, TimeseriesWidget } from './Widgets/TimeseriesWidget';

export const Dashboard = () => {
  const context = React.useContext(ServiceContext);
  const addSubscription = useSubscriptions();
  const [target, setTarget] = React.useState(undefined as Target | undefined);
  const [views, setViews] = React.useState([] as JSX.Element[]);

  React.useEffect(() => {
    addSubscription(
      context.target.target().subscribe(setTarget)
    );
  }, [context, context.target]);

  React.useEffect(() => {
    const timeseries: Datapoint[] = [];
    let accum = 0;
    for (let i = 0; i < 5; i++) {
      timeseries.push({
        name: 'HttpStatusException',
        x: i,
        y: accum
      });
      accum += Math.floor(Math.random() * 20);
    }
    setViews(old => {
      return [
        <TargetDetailsWidget target={target} />,
        <ArchivesWidget target={target} />,
        <ScoreWidget title="Automated Analysis" scores={[
          {
            label: 'CPU Load',
            description: 'CPU Load for the process',
            value: Math.floor(Math.random() * 100)
          },
          {
            label: 'Stop the World GC',
            description: 'STW GC is slow and should be avoided',
            value: Math.floor(Math.random() * 100)
          },
          {
            label: 'Environment Variables',
            description: 'Potentially sensitive information in Environment Variables',
            value: Math.floor(Math.random() * 100)
          },
        ]} />,
        <TimeseriesWidget title="Java Exceptions" data={timeseries} />,
        <AddWidget />,
      ];
    });
  }, [target]);

  return (<>
    <TargetView pageTitle="Dashboard" compactSelect={true} >
      <Gallery hasGutter
        minWidths={{
          default: '100%',
          md: '200px',
          lg: '400px',
        }}
        maxWidths={{
          md: '500px',
          lg: '1fr',
        }}>
        {
          views.map(view => <GalleryItem>{view}</GalleryItem>)
        }
      </Gallery>
    </TargetView>
  </>);

}
